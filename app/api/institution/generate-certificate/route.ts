/**
 * app/api/institution/generate-certificate/route.ts
 *
 * POST endpoint — accepts student data and renders high-res certificates
 * by burning the text onto the master template image.
 * Returns base64-encoded PNG images.
 */

import { NextResponse } from "next/server";
import { renderCertificate, type CertificateData } from "@/lib/certificate-renderer";
import { computeLeaf } from "@/lib/merkle";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { students, templatePath } = await request.json();

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { error: "No student data provided." },
        { status: 400 },
      );
    }

    const results: Array<{
      name: string;
      rollNumber: string;
      certificateBase64: string;
      credentialHash: string;
    }> = [];

    for (const student of students as CertificateData[]) {
      // Render the certificate image
      const pngBuffer = await renderCertificate(student, {
        templatePath: templatePath || undefined,
      });

      // Compute the credential hash for this student
      const leaf = computeLeaf({
        name: student.name,
        rollNumber: student.rollNumber,
        degreeTitle: student.degreeTitle,
        cgpa: student.cgpa,
        institutionName: (student as any).institutionName || "",
      });
      const credentialHash = "0x" + leaf.toString("hex");

      results.push({
        name: student.name,
        rollNumber: student.rollNumber,
        certificateBase64: pngBuffer.toString("base64"),
        credentialHash,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${results.length} certificate(s).`,
      certificates: results,
    });
  } catch (error: any) {
    console.error("API Error /institution/generate-certificate:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
