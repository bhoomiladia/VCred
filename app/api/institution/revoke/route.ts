import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import connectDB from '@/lib/mongodb';
import Degree from '@/models/Degree';
import User from '@/models/User';

// ABI fragment — only what we need for revocation
const VERICRED_ABI = [
  "function revokeCertificate(uint256 tokenId) external",
  "function isRevoked(uint256 tokenId) external view returns (bool)",
];

/**
 * POST /api/institution/revoke
 * Body: { tokenId: number, credentialHash: string, walletAddress: string }
 *
 * Calls revokeCertificate on-chain, then marks the DB record as REVOKED.
 */
export async function POST(request: Request) {
  try {
    const { tokenId, credentialHash, walletAddress } = await request.json();

    if (tokenId === undefined || !credentialHash || !walletAddress) {
      return NextResponse.json({ error: 'Missing tokenId, credentialHash, or walletAddress' }, { status: 400 });
    }

    await connectDB();

    // Ensure caller is an institution admin
    const caller = await User.findOne({
      walletAddress: walletAddress.toLowerCase(),
      role: 'institution',
      subRole: 'admin',
    }).lean();

    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized: only institution admins can revoke' }, { status: 403 });
    }

    // ── On-chain revocation ──────────────────────────────────────────────────
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress) {
      return NextResponse.json({ error: 'Server misconfiguration: missing blockchain env vars' }, { status: 500 });
    }

    let txHash = '';
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const signer = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(contractAddress, VERICRED_ABI, signer);

      const tx = await contract.revokeCertificate(tokenId);
      await tx.wait();
      txHash = tx.hash;
      console.log(`✅ Revoked tokenId=${tokenId} on-chain, tx=${txHash}`);
    } catch (onChainError: any) {
      console.error('⚠️ On-chain revocation failed:', onChainError.message);
      // Continue to update DB even if on-chain fails (log for manual review)
    }

    // ── DB update ────────────────────────────────────────────────────────────
    const degree = await Degree.findOneAndUpdate(
      { credentialHash },
      {
        status: 'REVOKED',
        revoked: true,
        ...(txHash ? { blockchainTxHash: txHash } : {}),
      },
      { new: true }
    );

    if (!degree) {
      return NextResponse.json({ error: 'Credential not found in database' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Certificate tokenId=${tokenId} has been revoked.`,
      txHash,
      degree,
    });
  } catch (error: any) {
    console.error('API Error /institution/revoke:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
