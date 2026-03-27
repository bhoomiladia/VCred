import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Degree from '@/models/Degree';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { VCredRegistryABI } from '@/lib/abi';

export async function POST(request: Request) {
  try {
    const { degreeId, address } = await request.json();

    if (!degreeId || !address) {
      return NextResponse.json({ error: 'Missing degreeId or address' }, { status: 400 });
    }

    await connectDB();

    // 1. Fetch degree record
    const degree = await Degree.findById(degreeId);
    if (!degree) {
      return NextResponse.json({ error: 'Degree not found' }, { status: 404 });
    }

    if (degree.isClaimed) {
      return NextResponse.json({ error: 'NFT already claimed for this credential' }, { status: 400 });
    }

    if (!degree.merkleProof || !degree.ipfsCid) {
      return NextResponse.json({ error: 'Credential metadata incomplete. Institution must mint/publish first.' }, { status: 400 });
    }

    const privateKey = process.env.PRIVATE_KEY;
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

    if (!privateKey || !rpcUrl || !contractAddress) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const account = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}` as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(rpcUrl),
    });
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl),
    });

    const uri = `https://gateway.pinata.cloud/ipfs/${degree.ipfsCid}`;
    const proof = (degree.merkleProof || []).map((p: string) => (p.startsWith('0x') ? p : `0x${p}`)) as `0x${string}`[];
    const issuer = degree.institutionName || 'VCred Institution';

    console.log(`Pumping tx for Claim NFT: address=${address}, uri=${uri}, issuer=${issuer}, isSolo=${proof.length === 0}`);

    // Call the appropriate contract function based on whether it's a batch or solo degree
    const isSolo = proof.length === 0;
    const txHash = await walletClient.writeContract({
      address: contractAddress as `0x${string}`,
      abi: VCredRegistryABI as any,
      functionName: isSolo ? 'issueCertificate' : 'mintCertificate',
      args: isSolo 
        ? [address as `0x${string}`, degree.credentialHash as `0x${string}`, uri, issuer]
        : [address as `0x${string}`, uri, proof, issuer],
    });

    // Wait for tx
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status === 'reverted') {
      return NextResponse.json({ error: 'Transaction reverted on-chain. Check if the batch is published.' }, { status: 500 });
    }

    // Update DB to mark as claimed
    degree.isClaimed = true;
    degree.mintTxHash = txHash;
    await degree.save();

    return NextResponse.json({
      success: true,
      txHash,
      message: 'NFT successfully sent to your wallet!',
    });
  } catch (error: any) {
    console.error('API Error /student/claim-nft:', error);
    return NextResponse.json({ error: error.message || 'Failed to claim NFT' }, { status: 500 });
  }
}
