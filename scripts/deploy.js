import { network } from "hardhat";

async function main() {
  /**
   * 1. CRITICAL STEP: In Hardhat 3, plugins like 'ethers' are attached 
   * to the connection object. We must 'connect' to the network first.
   */
  const connection = await network.connect();
  const { ethers } = connection;

  if (!ethers) {
    throw new Error("❌ Ethers not found on the connection. Ensure hardhat.config.ts is correct.");
  }

  // 2. Fetch the deployer from the connection's ethers instance
  const [deployer] = await ethers.getSigners();
  
  console.log(`📡 Connected to Sepolia`);
  console.log(`👤 Deploying with: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

  console.log("🚀 Deploying AccredRegistry...");

  // 3. Deployment (Passing the owner address to the constructor)
  const contract = await ethers.deployContract("AccredRegistry", [deployer.address]);
  
  console.log("⏳ Waiting for confirmation...");
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();

  console.log("\n" + "=".repeat(40));
  console.log(`✅ DEPLOYED: ${address}`);
  console.log(`🔗 https://sepolia.etherscan.io/address/${address}`);
  console.log("=".repeat(40));
}

main().catch((error) => {
  console.error("\n❌ Deployment Failed:");
  console.error(error.message || error);
  process.exitCode = 1;
});