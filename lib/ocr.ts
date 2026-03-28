import { createWorker } from "tesseract.js";
import Groq from "groq-sdk";
import { FILTER_PIPELINE, resizeForOcr } from "./image-preprocessing";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OcrResult {
  name: string;
  rollNumber: string;
  cgpa: number;
  degreeTitle: string;
  branch: string;
  institutionName: string;
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

interface ExtractedData {
  name: string;
  rollNumber: string;
  cgpa: number;
  degreeTitle: string;
  branch: string;
  institutionName: string;
}

async function extractStudentData(text: string): Promise<ExtractedData> {
  const empty: ExtractedData = { name: "", rollNumber: "", cgpa: 0, degreeTitle: "", branch: "", institutionName: "" };
  if (!text.trim()) return empty;

  // Try Groq LLM first, then regex fallback
  if (process.env.GROQ_API_KEY) {
    try {
      const result = await extractWithGroq(text);
      if (result.name || result.rollNumber) return result;
    } catch (error) {
      console.error("Groq Extraction Error (falling back to regex):", error);
    }
  }

  // Regex fallback
  return extractWithRegex(text);
}

async function extractWithGroq(text: string): Promise<ExtractedData> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const prompt = `You are extracting student credential information from a certificate or transcript.
Extract these fields from the text below:
1. Student Name (full name of the student)
2. Roll Number / Registration Number / Enrollment Number
3. CGPA or GPA (numeric, out of 10 scale. Convert from 4-point scale if needed)
4. Degree Title (e.g. "B.Tech in Computer Science", "Master of Business Administration")
5. Branch / Department / Major (e.g. "Computer Science", "Mechanical Engineering")  
6. Institution Name (name of the university or college)

Return ONLY a raw JSON object: {"name": "string", "rollNumber": "string", "cgpa": number, "degreeTitle": "string", "branch": "string", "institutionName": "string"}
If a field cannot be found, use "" for strings or 0 for numbers.
Do NOT wrap in markdown code blocks.

Text:
"""${text.slice(0, 3000)}"""`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama-3.1-8b-instant",
    temperature: 0,
    response_format: { type: "json_object" }
  });

  const raw = chatCompletion.choices[0]?.message?.content || "{}";
  const data = JSON.parse(raw);
  return {
    name: String(data.name || "").trim(),
    rollNumber: String(data.rollNumber || data.roll_number || data.registrationNumber || "").trim(),
    cgpa: parseFloat(data.cgpa || data.gpa) || 0,
    degreeTitle: String(data.degreeTitle || data.degree_title || data.degree || "").trim(),
    branch: String(data.branch || data.department || data.major || "").trim(),
    institutionName: String(data.institutionName || data.institution_name || data.university || "").trim(),
  };
}

function extractWithRegex(text: string): ExtractedData {
  const result: ExtractedData = { name: "", rollNumber: "", cgpa: 0, degreeTitle: "", branch: "", institutionName: "" };

  // Name patterns
  const namePatterns = [
    /(?:student\s*name|name\s*of\s*(?:the\s*)?student|candidate\s*name|name)\s*[:\-–]?\s*([A-Z][a-zA-Z\s.'-]{2,40})/i,
    /(?:this\s+is\s+to\s+certify\s+that|awarded\s+to|presented\s+to|conferred\s+upon)\s+([A-Z][a-zA-Z\s.'-]{2,40})/i,
  ];
  for (const p of namePatterns) {
    const m = text.match(p);
    if (m?.[1]) { result.name = m[1].trim(); break; }
  }

  // Roll number patterns
  const rollPatterns = [
    /(?:roll\s*(?:no|number|#)|registration\s*(?:no|number)|enrollment\s*(?:no|number)|reg\.?\s*no)\s*[:\-–]?\s*([A-Z0-9][\w\-\/]{3,20})/i,
    /\b([A-Z]{2,4}\d{4,}[A-Z]?\d{0,3})\b/,  // common roll number format like CS2024001
  ];
  for (const p of rollPatterns) {
    const m = text.match(p);
    if (m?.[1]) { result.rollNumber = m[1].trim(); break; }
  }

  // CGPA patterns
  const cgpaPatterns = [
    /(?:CGPA|C\.G\.P\.A|GPA|cumulative\s*grade)\s*[:\-–]?\s*(\d+\.?\d*)\s*(?:\/\s*10)?/i,
    /(\d\.\d{1,2})\s*(?:\/\s*10|out\s*of\s*10|on\s*a?\s*10)/i,
  ];
  for (const p of cgpaPatterns) {
    const m = text.match(p);
    if (m?.[1]) { result.cgpa = parseFloat(m[1]) || 0; break; }
  }

  // Degree title patterns
  const degreePatterns = [
    /(?:degree|programme|program|course)\s*[:\-–]?\s*([A-Z][A-Za-z\s.()]{3,60})/i,
    /\b(B\.?\s*Tech|M\.?\s*Tech|B\.?\s*E|M\.?\s*E|B\.?\s*Sc|M\.?\s*Sc|B\.?\s*A|M\.?\s*A|B\.?\s*Com|M\.?\s*Com|MBA|BBA|PhD|B\.?\s*Arch|M\.?\s*Arch)[\w\s.()]*(?:in\s+[\w\s()]+)?/i,
  ];
  for (const p of degreePatterns) {
    const m = text.match(p);
    if (m?.[0]) { result.degreeTitle = m[0].trim(); break; }
  }

  // Institution patterns
  const instPatterns = [
    /(?:university|institute|college|school)\s*(?:of)?\s*([A-Z][\w\s,&'-]{3,60})/i,
    /([A-Z][\w\s]{3,40}(?:University|Institute|College|School))/i,
  ];
  for (const p of instPatterns) {
    const m = text.match(p);
    if (m?.[0]) { result.institutionName = m[0].trim(); break; }
  }

  return result;
}

function extractionQuality(data: ExtractedData): number {
  let score = 100;
  if (!data.name || data.name.length < 3) score -= 40;
  if (!data.rollNumber || data.rollNumber.length < 4) score -= 40;
  if (data.cgpa === 0) score -= 10;
  if (!data.degreeTitle) score -= 5;
  if (!data.institutionName) score -= 5;
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

      // Good enough — stop early
      if (combined >= 85 && extracted.name && extracted.rollNumber) break;
    }
  } finally {
    await worker.terminate();
  }

  return bestResult || {
    name: "", rollNumber: "", cgpa: 0, degreeTitle: "", branch: "", institutionName: "",
    confidence: 0, rawText: "", filterUsed: "failed", needsReview: true, attempts: maxRetries
  };
}

// ── PDF to Text Extraction ────────────────────────────────────────────────────

function isPdf(buffer: Buffer): boolean {
  return buffer.length > 4 && buffer.slice(0, 4).toString() === "%PDF";
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (error) {
    console.error("pdf-parse extraction error:", error);
    return "";
  }
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

export async function extractFromImage(
  buffer: Buffer,
  options: OcrOptions = {},
): Promise<OcrResult> {
  // ── Standard Image (JPG, PNG) ──
  if (!isPdf(buffer)) {
    return await performOcrWithRetry(buffer, options);
  }

  // ── PDF Processing ──
  // Strategy A: Try digital text extraction first
  const digitalText = await extractTextFromPdf(buffer);
  
  if (digitalText && digitalText.trim().length > 50) {
    const extracted = await extractStudentData(digitalText);
    if (extractionQuality(extracted) >= 60) {
      return {
        ...extracted,
        confidence: 95,
        rawText: digitalText,
        filterUsed: "pdf-parse (digital)",
        needsReview: extractionQuality(extracted) < 75,
        attempts: 1,
      };
    }
  }

  // Strategy B: Rasterize first page and run Tesseract OCR
  console.log("Digital extraction empty or low quality, attempting PDF rasterization...");
  
  try {
    // Use sharp to attempt to read the PDF as an image (works for single-page PDFs)
    const sharp = (await import('sharp')).default;
    const imageBuffer = await sharp(buffer, { density: 250, pages: 1 })
      .png()
      .toBuffer();

    return await performOcrWithRetry(imageBuffer, options);
  } catch (rasterError) {
    console.error("PDF rasterization failed:", rasterError);

    // Strategy C: If we got any digital text at all, try to use it with lower threshold
    if (digitalText && digitalText.trim().length > 10) {
      const extracted = await extractStudentData(digitalText);
      return {
        ...extracted,
        confidence: 50,
        rawText: digitalText,
        filterUsed: "pdf-parse (low-quality fallback)",
        needsReview: true,
        attempts: 1,
      };
    }

    return {
      name: "", rollNumber: "", cgpa: 0, degreeTitle: "", branch: "", institutionName: "",
      confidence: 0, rawText: "", filterUsed: "pdf-failed", needsReview: true, attempts: 1
    };
  }
}