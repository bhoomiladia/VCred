import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Degree from '@/models/Degree';
import { computeLeaf, buildTree, getHexRoot, getHexProof } from '@/lib/merkle';
import { PinataSDK } from "pinata-web3";
import { sendIssuanceEmail } from '@/lib/mail';
import User from '@/models/User';
import fs from 'fs';
import path from 'path';

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT || "",
  pinataGateway: process.env.NEXT_PUBLIC_GATEWAY_URL || "gateway.pinata.cloud"
});

export async function POST(request: Request) {
  try {
    let { batchId } = await request.json();
    batchId = batchId?.trim();

    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
    }

    await connectDB();

    // Find all eligible pending students for this batch
    // We remove the CGPA >= 6.0 filter here to ensure all uploaded students are minted.
    // Quality control should happen at the upload/issue stage.
    const pendingStudents = await Degree.find({
      batchId: batchId,
      status: "PENDING"
    });

    if (pendingStudents.length === 0) {
      return NextResponse.json({ error: 'No eligible pending students found for this batch' }, { status: 404 });
    }

    // ── DOMAIN VERIFICATION ──
    const institutionId = pendingStudents[0].institutionId;
    if (!institutionId) {
       return NextResponse.json({ error: 'Institution ID missing from student records.' }, { status: 400 });
    }

    const institution = await User.findOne({ walletAddress: institutionId.toLowerCase() });
    if (!institution) {
       return NextResponse.json({ error: 'Institution not found.' }, { status: 404 });
    }

    const officialDomain = institution.officialEmailDomain?.toLowerCase().trim();
    if (!officialDomain) {
      return NextResponse.json({ 
        error: 'Institution domain not verified. Please contact HQ to verify your official email domain.' 
      }, { status: 403 });
    }

    // Secondary Check: Ensure all students in this batch match the domain
    const invalidStudents = pendingStudents.filter(s => {
      const emailDomain = s.email?.split('@')[1]?.toLowerCase().trim();
      return emailDomain !== officialDomain;
    });

    if (invalidStudents.length > 0) {
      return NextResponse.json({ 
        error: `Domain mismatch detected in batch. ${invalidStudents.length} students have emails not ending in @${officialDomain}.`,
        details: invalidStudents.map(s => `${s.name} (${s.email})`)
      }, { status: 403 });
    }

    // 1. Generate leaves for the batch (using shared merkle module)
    const leaves = pendingStudents.map(student =>
      computeLeaf({
        name: student.name,
        rollNumber: student.rollNumber,
        degreeTitle: student.degreeTitle,
        cgpa: student.cgpa,
        institutionName: student.institutionName || ""
      })
    );

    // 2. Build Merkle Tree (OpenZeppelin compatible)
    const tree = buildTree(leaves);
    const hexRoot = getHexRoot(tree);

    // Helper to gracefully sleep
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // 3. Process students in chunks to prevent IPFS Pinata rate limits (429)
    //    With IPFS CID Recovery: check DB before calling Pinata.
    const processedStudents: any[] = [];
    const CHUNK_SIZE = 3;

    for (let i = 0; i < pendingStudents.length; i += CHUNK_SIZE) {
      const chunk = pendingStudents.slice(i, i + CHUNK_SIZE);
      
      const chunkResults = await Promise.all(chunk.map(async (student, chunkIndex) => {
        const globalIndex = i + chunkIndex;
        const leaf = leaves[globalIndex];
        const hexLeaf = '0x' + leaf.toString('hex');
        const proof = getHexProof(tree, leaf);

        // Generate ERC-721 Metadata
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const issuerName = institution.institutionName || institution.name || student.institutionName || 'VCred Institution';
        
        // Read and Base64 encode the VCred NFT logo so it loads successfully on Etherscan
        const logoPath = path.join(process.cwd(), 'public', 'vcred-nft-logo.png');
        const logoBase64 = fs.existsSync(logoPath) ? fs.readFileSync(logoPath, 'base64') : '';
        const imageUri = logoBase64 ? `data:image/png;base64,${logoBase64}` : `${appUrl}/vcred-nft-logo.png`;

        const metadata = {
          name: `${student.name} - ${student.degreeTitle}`,
          description: `Soulbound Academic Credential for ${student.name} from ${issuerName}. This credential is non-transferable and permanently bound to the recipient's wallet.`,
          image: imageUri,
          attributes: [
            { trait_type: "Student Name", value: student.name },
            { trait_type: "Roll Number", value: student.rollNumber },
            { trait_type: "Degree", value: student.degreeTitle },
            { trait_type: "Branch", value: student.branch },
            { trait_type: "CGPA", value: student.cgpa },
            { trait_type: "Institution", value: student.institutionName },
            { trait_type: "Batch ID", value: student.batchId },
            { trait_type: "Credential Hash", value: hexLeaf },
            { trait_type: "Template ID", value: student.templateId || "professional" },
            { trait_type: "Soulbound", value: "Yes" },
            { trait_type: "Token Standard", value: "ERC-721 (Non-Transferable)" }
          ],
          external_url: `${appUrl}/verify/${hexLeaf}`
        };

        let ipfsCid = "";

        // ── RECOVERY: Check if this credential hash already has an IPFS CID in DB ──
        const existingRecord = await Degree.findOne({ credentialHash: hexLeaf, ipfsCid: { $ne: "" } }).lean() as any;

        if (existingRecord?.ipfsCid) {
          console.log(`♻️ Recovered existing IPFS CID for ${student.rollNumber}: ${existingRecord.ipfsCid}`);
          ipfsCid = existingRecord.ipfsCid;
        } else {
          // ── UPLOAD: Only call Pinata if we have no record of this hash ──
          let retries = 3;
          while (retries > 0) {
            try {
              const upload = await pinata.upload.json(metadata);
              ipfsCid = upload.IpfsHash;
              break; // Success
            } catch (e: any) {
              const isRateLimit = e?.statusCode === 429 || JSON.stringify(e).includes("RATE_LIMITED");
              if (isRateLimit && retries > 1) {
                console.warn(`⏳ Rate limited by Pinata for ${student.rollNumber}. Waiting 3s before retry...`);
                await sleep(3000);
                retries--;
              } else {
                // ── ATOMIC: Throw on failure to prevent blank CID records ──
                console.error(`❌ Pinata failed for ${student.rollNumber}:`, e);
                throw new Error(`Failed to pin metadata for ${student.rollNumber}. Aborting batch mint.`);
              }
            }
          }
        }

        return {
          updateOne: {
            filter: { _id: student._id },
            update: {
              $set: {
                credentialHash: hexLeaf,
                merkleProof: proof,
                merkleRoot: hexRoot,
                ipfsCid: ipfsCid,
                status: "MINTED"
              }
            }
          }
        };
      }));
      
      processedStudents.push(...chunkResults);
      
      // Delay between chunks to respect rate limits
      if (i + CHUNK_SIZE < pendingStudents.length) {
        await sleep(1500);
      }
    }

    await Degree.bulkWrite(processedStudents as any);

    return NextResponse.json({ 
      success: true, 
      message: `Successfully generated Merkle profiles for ${pendingStudents.length} students in batch ${batchId}.`,
      merkleRoot: hexRoot,
      studentCount: pendingStudents.length
    });

  } catch (error: any) {
    console.error('API Error /institution/mint-batch:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
