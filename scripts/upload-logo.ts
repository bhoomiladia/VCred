import { PinataSDK } from "pinata-web3";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: '.env' });

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT || "",
  pinataGateway: process.env.NEXT_PUBLIC_GATEWAY_URL || "gateway.pinata.cloud"
});

async function uploadLogo() {
  try {
    const blob = new Blob([fs.readFileSync("./public/vcred-nft-logo.png")]);
    const file = new File([blob], "vcred-nft-logo.png", { type: "image/png" });
    const upload = await pinata.upload.file(file);
    console.log("Uploaded successfully!");
    console.log("IPFS Hash:", upload.IpfsHash);
  } catch (error) {
    console.error("Upload failed:", error);
  }
}

uploadLogo();
