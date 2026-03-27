import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { VCredRegistryABI } from '@/lib/abi';

/**
 * POST /api/institution/publish-batch
 *
 * Server-side blockchain publishing: calls `setBatchRoot(batchId, root)` on the
 * VCredRegistry contract using the deployer's private key.
 *
 * This eliminates the need for institution users to have MetaMask or admin rights
 * on the contract. The deployer key is already in .env.local as PRIVATE_KEY.
 *
 * Body: { batchId: string, merkleRoot: string }
 * Returns: { success: boolean, txHash: string }
 */
export async function POST(request: Request) {
  try {
    const { batchId, merkleRoot } = await request.json();

    if (!batchId || !merkleRoot) {
      return NextResponse.json(
        { error: 'batchId and merkleRoot are required' },
        { status: 400 }
      );
    }

    const privateKey = process.env.PRIVATE_KEY;
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

    if (!privateKey || !rpcUrl || !contractAddress) {
      console.error('Missing env vars: PRIVATE_KEY, SEPOLIA_RPC_URL, or NEXT_PUBLIC_CONTRACT_ADDRESS');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Ensure root is properly formatted as 0x...
    let root = merkleRoot;
    if (!root.startsWith('0x')) root = '0x' + root;

    // Create viem account from deployer private key
    const account = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}` as `0x${string}`);

    // Create wallet client (for writing)
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(rpcUrl),
    });

    // Create public client (for waiting on tx)
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl),
    });

    // Note: duplicate root protection is handled by the contract itself (on-chain revert)

    // Send the transaction — contract function is setMerkleRoot(bytes32 root)
    const txHash = await walletClient.writeContract({
      address: contractAddress as `0x${string}`,
      abi: VCredRegistryABI,
      functionName: 'setMerkleRoot',
      args: [root as `0x${string}`],
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status === 'reverted') {
      return NextResponse.json(
        { error: 'Transaction reverted on-chain. The Merkle root may have already been processed.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      txHash: txHash,
      blockNumber: receipt.blockNumber.toString(),
    });
  } catch (error: any) {
    console.error('API Error /institution/publish-batch:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to publish batch on-chain' },
      { status: 500 }
    );
  }
}
