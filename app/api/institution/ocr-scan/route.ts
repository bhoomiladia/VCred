/**
 * app/api/institution/ocr-scan/route.ts
 * 
 * POST endpoint — accepts multipart/form-data with image/PDF files.
 * Runs the OCR pipeline with agentic retry on each file, extracts
 * student data, and optionally cross-references with the university DB.
 */

import { NextResponse } from "next/server";
import { extractFromImage } from "@/lib/ocr";
import connectDB from "@/lib/mongodb";
import Degree from "@/models/Degree";

// Disable Next.js body parser for file uploads
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const crossReference = formData.get("crossReference") === "true";

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided. Upload image or PDF files." },
        { status: 400 },
      );
    }

    const results: Array<{
      filename: string;
      name: string;
      rollNumber: string;
      cgpa: number;
      confidence: number;
      filterUsed: string;
      needsReview: boolean;
      attempts: number;
      dbMatch?: {
        found: boolean;
        matchesName?: boolean;
        matchesCgpa?: boolean;
        existingRecord?: {
          name: string;
          rollNumber: string;
          cgpa: number;
          batchId: string;
        };
      };
    }> = [];

    // Connect to DB if cross-referencing
    if (crossReference) {
      await connectDB();
    }

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Run OCR with agentic retry logic
      const ocrResult = await extractFromImage(buffer, {
        minConfidence: 80,
      });

      const entry: (typeof results)[0] = {
        filename: file.name,
        name: ocrResult.name,
        rollNumber: ocrResult.rollNumber,
        cgpa: ocrResult.cgpa,
        confidence: ocrResult.confidence,
        filterUsed: ocrResult.filterUsed,
        needsReview: ocrResult.needsReview,
        attempts: ocrResult.attempts,
      };

      // Cross-reference with MongoDB if requested
      if (crossReference && ocrResult.rollNumber) {
        const existing = await Degree.findOne({
          rollNumber: ocrResult.rollNumber,
        }).lean();

        if (existing) {
          entry.dbMatch = {
            found: true,
            matchesName:
              existing.name.toLowerCase().trim() ===
              ocrResult.name.toLowerCase().trim(),
            matchesCgpa: existing.cgpa === ocrResult.cgpa,
            existingRecord: {
              name: existing.name,
              rollNumber: existing.rollNumber,
              cgpa: existing.cgpa,
              batchId: existing.batchId,
            },
          };
        } else {
          entry.dbMatch = { found: false };
        }
      }

      results.push(entry);
    }

    const totalScanned = results.length;
    const needsReviewCount = results.filter((r) => r.needsReview).length;
    const highConfidenceCount = results.filter(
      (r) => !r.needsReview,
    ).length;

    return NextResponse.json({
      success: true,
      message: `Scanned ${totalScanned} file(s). ${highConfidenceCount} high-confidence, ${needsReviewCount} need review.`,
      totalScanned,
      highConfidenceCount,
      needsReviewCount,
      results,
    });
  } catch (error: any) {
    console.error("API Error /institution/ocr-scan:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
