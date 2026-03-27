import { extractFromImage, OcrResult } from "./ocr";

/**
 * Fetches an external certificate from a URL and extracts its metadata via OCR.
 * Handles direct image/PDF links and common certificate portals like NPTEL.
 */
export async function fetchExternalData(url: string): Promise<OcrResult | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

    const contentType = response.headers.get("content-type") || "";
    let buffer: Buffer;

    if (contentType.includes("image/") || contentType.includes("application/pdf")) {
      // Direct file link
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes("text/html")) {
      // Portal page, try to find embedded image
      const html = await response.text();
      
      // Look for base64 image (common in NPTEL)
      const base64Match = html.match(/src="data:image\/[a-zA-Z]+;base64,([^"]+)"/);
      if (base64Match && base64Match[1]) {
        buffer = Buffer.from(base64Match[1], "base64");
      } else {
        // Look for normal img src
        const imgMatch = html.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch && imgMatch[1]) {
          let imgSrc = imgMatch[1];
          if (!imgSrc.startsWith("http")) {
            const baseUrl = new URL(url).origin;
            imgSrc = new URL(imgSrc, baseUrl).href;
          }
          const imgResponse = await fetch(imgSrc);
          const arrayBuffer = await imgResponse.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        } else {
          throw new Error("No certificate image found on page");
        }
      }
    } else {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    // Run OCR on the fetched certificate
    return await extractFromImage(buffer);
  } catch (error) {
    console.error("External Fetch Error:", error);
    return null;
  }
}
