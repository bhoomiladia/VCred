const fs = require('fs');
const path = require('path');

try {
  const artifactPath = path.join(__dirname, '../artifacts/contracts/VeriCredRegistry.sol/AccredRegistry.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const abiContent = `/**
 * ABI for the deployed VCredRegistry contract.
 */
export const VCredRegistryABI = ${JSON.stringify(artifact.abi, null, 2)} as const;
`;

  const abiPath = path.join(__dirname, '../lib/abi.ts');
  fs.writeFileSync(abiPath, abiContent, 'utf8');
  console.log('ABI successfully updated in lib/abi.ts');
} catch (err) {
  console.error('Error updating ABI:', err);
  process.exit(1);
}
