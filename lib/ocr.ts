import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { createWorker } from "tesseract.js";
import Groq from "groq-sdk";
import { FILTER_PIPELINE, resizeForOcr } from "./image-preprocessing";

// Apryse Node.js SDK
const { PDFNet } = require('@pdftron/pdfnet-node');

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OcrResult {
  name: string;
  rollNumber: string;
  cgpa: number;
  confidence: number;
  rawText: string;
  filterUsed: string;
  needsReview: boolean;
  attempts: number;
}

export interface OcrOptions {
  minConfidence?: number;
  maxRetries?: number;
}

// ── Groq LLM Data Extraction ──────────────────────────────────────────────────

async function extractStudentData(text: string): Promise<{ name: string; rollNumber: string; cgpa: number }> {
  if (!process.env.GROQ_API_KEY || !text.trim()) {
    return { name: "", rollNumber: "", cgpa: 0 };
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const prompt = `
    Extract from transcript text: 1. Student Name, 2. Roll Number, 3. CGPA (out of 10).
    Return ONLY raw JSON: {"name": "string", "rollNumber": "string", "cgpa": number}.
    If not found, use "" or 0.
    Text: """${text}"""
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const data = JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");
    return {
      name: data.name || "",
      rollNumber: data.rollNumber || "",
      cgpa: parseFloat(data.cgpa) || 0
    };
  } catch (error) {
    console.error("Groq Extraction Error:", error);
    return { name: "", rollNumber: "", cgpa: 0 };
  }
}

function extractionQuality(data: { name: string; rollNumber: string; cgpa: number }): number {
  let score = 100;
  if (!data.name || data.name.length < 3) score -= 40;
  if (!data.rollNumber || data.rollNumber.length < 4) score -= 40;
  if (data.cgpa === 0) score -= 20;
  return score;
}

// ── Tesseract OCR with Retry ──────────────────────────────────────────────────

async function performOcrWithRetry(
  imageBuffer: Buffer,
  options: OcrOptions
): Promise<OcrResult> {
  const maxRetries = Math.min(options.maxRetries ?? 3, FILTER_PIPELINE.length);
  const upscaled = await resizeForOcr(imageBuffer);

  const worker = await createWorker("eng");
  let bestResult: OcrResult | null = null;
  let bestScore = -1;

  try {
    for (let i = 0; i < maxRetries; i++) {
      const filter = FILTER_PIPELINE[i];
      const processed = i === 0 ? upscaled : await filter.apply(upscaled);

      const { data: { text, confidence } } = await worker.recognize(processed);
      const extracted = await extractStudentData(text);
      const eqScore = extractionQuality(extracted);

      const combined = (confidence + eqScore) / 2;

      const currentResult: OcrResult = {
        ...extracted,
        confidence,
        rawText: text,
        filterUsed: filter.name,
        needsReview: combined < 75,
        attempts: i + 1,
      };

      if (combined > bestScore) {
        bestScore = combined;
        bestResult = currentResult;
      }

      if (combined >= 85 && extracted.cgpa > 0) break;
    }
  } finally {
    await worker.terminate();
  }

  return bestResult || {
    name: "", rollNumber: "", cgpa: 0, confidence: 0,
    rawText: "", filterUsed: "failed", needsReview: true, attempts: maxRetries
  };
}

// ── Main Entry Point using Apryse (PDFTron) ───────────────────────────────────

function isPdf(buffer: Buffer): boolean {
  return buffer.length > 4 && buffer.slice(0, 4).toString() === "%PDF";
}

export async function extractFromImage(
  buffer: Buffer,
  options: OcrOptions = {},
): Promise<OcrResult> {
  // If it's a standard Image (JPG, PNG)
  if (!isPdf(buffer)) {
    return await performOcrWithRetry(buffer, options);
  }

  // ── Apryse PDF Extraction Workflow ──
  let finalResult: OcrResult | null = null;

  const runApryseExtraction = async () => {
    // Apryse automatically reads standard PDF formats from buffers
    const doc = await PDFNet.PDFDoc.createFromBuffer(buffer);
    doc.initSecurityHandler();

    const pageCount = await doc.getPageCount();
    if (pageCount === 0) throw new Error("PDF has no pages.");

    const page = await doc.getPage(1); // Read only the first page

    // Strategy A: Try to extract digital text first using Apryse TextExtractor
    const txt = await PDFNet.TextExtractor.create();
    txt.begin(page);
    const digitalText = await txt.getAsText();

    // If we extracted a decent amount of text, parse it with Groq
    if (digitalText && digitalText.trim().length > 50) {
      const extracted = await extractStudentData(digitalText);
      if (extractionQuality(extracted) >= 75) {
        finalResult = {
          ...extracted,
          confidence: 99,
          rawText: digitalText,
          filterUsed: "apryse-textextractor (digital)",
          needsReview: false,
          attempts: 1,
        };
        return; // Success, exit the Apryse block early
      }
    }

    console.log("Digital extraction empty or low quality, rasterizing with Apryse...");

    // Strategy B: If scanned PDF, use PDFDraw to rasterize the page
    const pdfDraw = await PDFNet.PDFDraw.create();
    await pdfDraw.setDPI(250); // High DPI setting for crisp OCR reading

    // Save to temp file since Apryse Export interacts best with the Node.js File System
    const tmpFilePath = path.join(os.tmpdir(), `apryse-raster-${Date.now()}.png`);
    await pdfDraw.export(page, tmpFilePath, "PNG");

    // Read the generated high-quality image back into a standard Buffer
    const imageBuffer = await fs.readFile(tmpFilePath);

    // Cleanup the temp file immediately to avoid filling up the server
    await fs.unlink(tmpFilePath).catch(() => { });

    // Run our standard Tesseract OCR on the newly rasterized PDF image
    finalResult = await performOcrWithRetry(imageBuffer, options);
  };

  try {
    // runWithCleanup automatically frees C++ memory efficiently. 
    // The second parameter is the license key. An empty string runs it in Demo/Trial mode.
    await PDFNet.runWithCleanup(runApryseExtraction, process.env.APRYSE_LICENSE_KEY || "");
  } catch (error) {
    console.error("Apryse PDF Processing Error:", error);
    return {
      name: "", rollNumber: "", cgpa: 0, confidence: 0,
      rawText: "", filterUsed: "apryse-failed", needsReview: true, attempts: 1
    };
  }

  return finalResult || {
    name: "", rollNumber: "", cgpa: 0, confidence: 0,
    rawText: "", filterUsed: "apryse-failed", needsReview: true, attempts: 1
  };
}