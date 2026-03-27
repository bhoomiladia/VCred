/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['tesseract.js', 'sharp', 'pdf-parse', '@pdftron/pdfnet-node'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
