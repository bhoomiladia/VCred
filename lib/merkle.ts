/**
 * lib/merkle.ts
 * Reusable Merkle Tree utilities for VCred.
 *
 * Uses keccak256 with sortPairs: true (OpenZeppelin / Solidity compatible).
 * This module is the single source of truth — both the issueBatch script
 * and the mint-batch API route should import from here.
 */

import { MerkleTree } from "merkletreejs";
import crypto from 'crypto';

function sha256(data: Buffer | string): Buffer {
  return crypto.createHash('sha256').update(data).digest();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StudentLeafData {
  name: string;
  rollNumber: string;
  degreeTitle: string;
  cgpa: number;
  institutionName: string;
}

export interface BatchMerkleResult {
  root: string;                // hex-prefixed root
  proofs: Map<number, string[]>; // index → hex-prefixed proof[]
  leaves: Buffer[];
  tree: MerkleTree;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Compute the keccak256 leaf for a student.
 * Formula matches the Solidity verifier:
 *   keccak256(name + rollNumber + degreeTitle + cgpa)
 */
export function computeLeaf(student: StudentLeafData): Buffer {
  return sha256(
    Buffer.from(
      student.name + 
      student.rollNumber + 
      student.degreeTitle + 
      student.cgpa +
      (student.institutionName || "")
    ),
  );
}

/**
 * Build a Merkle tree from a list of leaves.
 * OpenZeppelin-compatible: sortPairs = true.
 */
export function buildTree(leaves: Buffer[]): MerkleTree {
  return new MerkleTree(leaves, sha256, { sortPairs: true });
}

/** Hex-prefixed root. */
export function getHexRoot(tree: MerkleTree): string {
  return tree.getHexRoot();
}

/** Hex-prefixed proof array for a given leaf. */
export function getHexProof(tree: MerkleTree, leaf: Buffer): string[] {
  return tree.getHexProof(leaf);
}

// ── Convenience all-in-one ────────────────────────────────────────────────────

/**
 * Given an array of students, compute leaves, build the tree,
 * and return the root + per-student proofs.
 */
export function buildBatchMerkle(
  students: StudentLeafData[],
): BatchMerkleResult {
  const leaves = students.map(computeLeaf);
  const tree = buildTree(leaves);
  const root = getHexRoot(tree);

  const proofs = new Map<number, string[]>();
  for (let i = 0; i < leaves.length; i++) {
    proofs.set(i, getHexProof(tree, leaves[i]));
  }

  return { root, proofs, leaves, tree };
}
