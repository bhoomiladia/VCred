/**
 * Utility to extract verification links or hashes from raw text.
 */

// Common certificate portal patterns
const PATTERNS = [
  /https?:\/\/nptel\.ac\.in\/noc\/E_Certificate\/[A-Z0-9]+/i,
  /https?:\/\/archive\.nptel\.ac\.in\/noc\/Ecertificate\/\?q=[A-Z0-9]+/i,
  /https?:\/\/vcred\.io\/verify\/0x[a-fA-F0-9]{64}/i,
  /https?:\/\/[^\s]+\/verify\/[^\s]+/i, // Generic verification pattern
  /0x[a-fA-F0-9]{64}/ // Blockchain hash
];

export function extractReference(text: string): string | null {
  for (const pattern of PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return null;
}
