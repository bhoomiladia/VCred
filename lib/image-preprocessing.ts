/**
 * lib/image-preprocessing.ts
 * Sharp-based image filter pipeline for OCR preprocessing.
 *
 * Each filter returns a new Buffer so we can chain / retry with
 * progressively more aggressive transformations.
 */

import sharp from "sharp";

/**
 * Convert any input buffer to a guaranteed-supported PNG format.
 * This handles edge cases where uploaded files have unusual headers.
 */
export async function toSupportedFormat(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer).png().toBuffer();
  } catch {
    // If sharp can't read it at all, return the original buffer
    // and let Tesseract try to handle it directly
    return buffer;
  }
}

// ── Filter 0 — just normalise to PNG so Tesseract always gets a clean input ───
export async function normalise(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer).png().toBuffer();
  } catch {
    return buffer;
  }
}

// ── Filter 1 — sharpen + increase contrast ────────────────────────────────────
export async function sharpenAndContrast(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .sharpen({ sigma: 2, m1: 1.5, m2: 0.7 })
      .modulate({ brightness: 1.1 })
      .linear(1.5, -(128 * 0.5)) // boost contrast
      .png()
      .toBuffer();
  } catch {
    return buffer;
  }
}

// ── Filter 2 — grayscale + adaptive threshold ─────────────────────────────────
export async function grayscaleThreshold(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .grayscale()
      .threshold(140)
      .png()
      .toBuffer();
  } catch {
    return buffer;
  }
}

// ── Filter 3 — invert colours (useful for dark-background scans) ──────────────
export async function invertColors(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .negate({ alpha: false })
      .png()
      .toBuffer();
  } catch {
    return buffer;
  }
}

// ── Utility — upscale small images so Tesseract gets enough DPI ───────────────
export async function resizeForOcr(
  buffer: Buffer,
  minWidth = 1800,
): Promise<Buffer> {
  // First ensure the buffer is in a supported format
  const safeBuffer = await toSupportedFormat(buffer);

  try {
    const meta = await sharp(safeBuffer).metadata();
    const currentWidth = meta.width ?? 0;

    if (currentWidth >= minWidth || currentWidth === 0) {
      return safeBuffer;
    }

    const scale = Math.ceil(minWidth / Math.max(currentWidth, 1));
    return sharp(safeBuffer)
      .resize({ width: currentWidth * scale, kernel: "lanczos3" })
      .png()
      .toBuffer();
  } catch {
    // If resize fails, just return the safe buffer as-is
    return safeBuffer;
  }
}

/**
 * Ordered filter pipeline used by the agentic retry loop.
 * Index 0 is the mildest; index 3 is the most aggressive.
 */
export const FILTER_PIPELINE: Array<{
  name: string;
  apply: (buf: Buffer) => Promise<Buffer>;
}> = [
  { name: "original",            apply: normalise },
  { name: "sharpen+contrast",    apply: sharpenAndContrast },
  { name: "grayscale+threshold", apply: grayscaleThreshold },
  { name: "invert",              apply: invertColors },
];
