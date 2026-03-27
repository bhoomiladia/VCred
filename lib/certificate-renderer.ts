/**
 * lib/certificate-renderer.ts
 * Template Engine — "burns" extracted student data onto a clean
 * high-res master certificate template using Sharp + SVG overlay.
 *
 * This is the TypeScript equivalent of using Python Pillow (PIL)
 * to draw text on an image.
 */

import sharp from "sharp";
import path from "path";
import fs from "fs";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CertificateData {
  name: string;
  rollNumber: string;
  degreeTitle: string;
  branch: string;
  cgpa: number;
  institutionName?: string;
  issuedDate?: string;       // formatted date string
  batchId?: string;
}

export interface RenderOptions {
  /** Absolute path to the template PNG (defaults to public/templates/master-template.png) */
  templatePath?: string;
  /** Output width in pixels (default 2480 — A4 @ 300 DPI) */
  width?: number;
  /** Output height in pixels (default 3508 — A4 @ 300 DPI) */
  height?: number;
}

// ── SVG text overlay builder ──────────────────────────────────────────────────

function buildSvgOverlay(
  data: CertificateData,
  width: number,
  height: number,
): string {
  const issuedDate = data.issuedDate ?? new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const institution = data.institutionName ?? "Heritage Institute of Technology, Kolkata";

  // All coordinates are percentages of the canvas so they scale with resolution
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .title    { font: bold 64px 'Georgia', 'Times New Roman', serif; fill: #1a1a2e; }
        .subtitle { font: 36px 'Georgia', 'Times New Roman', serif; fill: #333; }
        .label    { font: 28px 'Arial', 'Helvetica', sans-serif; fill: #555; }
        .value    { font: bold 36px 'Arial', 'Helvetica', sans-serif; fill: #1a1a2e; }
        .name     { font: bold 56px 'Georgia', 'Times New Roman', serif; fill: #0d47a1; }
        .date     { font: 24px 'Arial', 'Helvetica', sans-serif; fill: #666; }
        .inst     { font: bold 44px 'Georgia', 'Times New Roman', serif; fill: #1a1a2e; }
      </style>

      <!-- Institution Name -->
      <text x="50%" y="15%" text-anchor="middle" class="inst">${escapeXml(institution)}</text>

      <!-- Certificate Title -->
      <text x="50%" y="23%" text-anchor="middle" class="title">Certificate of Achievement</text>
      <text x="50%" y="28%" text-anchor="middle" class="subtitle">This is to certify that</text>

      <!-- Student Name -->
      <text x="50%" y="38%" text-anchor="middle" class="name">${escapeXml(data.name)}</text>

      <!-- Degree Info -->
      <text x="50%" y="46%" text-anchor="middle" class="subtitle">
        has been awarded the degree of
      </text>
      <text x="50%" y="52%" text-anchor="middle" class="title">${escapeXml(data.degreeTitle)}</text>
      <text x="50%" y="57%" text-anchor="middle" class="subtitle">
        in ${escapeXml(data.branch)}
      </text>

      <!-- Details Table -->
      <text x="25%" y="68%" class="label">Roll Number:</text>
      <text x="55%" y="68%" class="value">${escapeXml(data.rollNumber)}</text>

      <text x="25%" y="73%" class="label">CGPA:</text>
      <text x="55%" y="73%" class="value">${data.cgpa.toFixed(2)} / 10.00</text>

      ${data.batchId ? `
      <text x="25%" y="78%" class="label">Batch:</text>
      <text x="55%" y="78%" class="value">${escapeXml(data.batchId)}</text>
      ` : ""}

      <!-- Date -->
      <text x="50%" y="88%" text-anchor="middle" class="date">Issued on: ${escapeXml(issuedDate)}</text>

      <!-- Decorative bottom line -->
      <line x1="20%" y1="92%" x2="80%" y2="92%" stroke="#0d47a1" stroke-width="2"/>
    </svg>
  `;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ── Main renderer ─────────────────────────────────────────────────────────────

/**
 * Render a high-res certificate by compositing an SVG text overlay onto
 * the master template image.
 *
 * @returns PNG buffer of the final certificate image.
 */
export async function renderCertificate(
  data: CertificateData,
  options: RenderOptions = {},
): Promise<Buffer> {
  const width = options.width ?? 2480;
  const height = options.height ?? 3508;

  const templatePath =
    options.templatePath ??
    path.join(process.cwd(), "public", "templates", "master-template.png");

  // Build the SVG overlay
  const svgOverlay = buildSvgOverlay(data, width, height);
  const svgBuffer = Buffer.from(svgOverlay);

  // Check if template exists — if not, create a plain white background
  let baseImage: sharp.Sharp;
  if (fs.existsSync(templatePath)) {
    baseImage = sharp(templatePath).resize(width, height, { fit: "cover" });
  } else {
    // Generate a clean white canvas as fallback
    baseImage = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    });
  }

  // Composite the SVG text on top of the template
  const result = await baseImage
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png({ quality: 100 })
    .toBuffer();

  return result;
}

// ── Batch renderer ────────────────────────────────────────────────────────────

/**
 * Render certificates for multiple students.
 * Returns an array of PNG buffers in the same order as input.
 */
export async function renderCertificates(
  students: CertificateData[],
  options: RenderOptions = {},
): Promise<Buffer[]> {
  const results: Buffer[] = [];
  for (const student of students) {
    results.push(await renderCertificate(student, options));
  }
  return results;
}
