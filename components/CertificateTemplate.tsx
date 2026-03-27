import React, { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface CertificateProps {
  studentName: string;
  rollNumber: string;
  degreeTitle: string;
  branch: string;
  cgpa: number;
  issueDate: Date | string;
  credentialHash: string;
  merkleRoot: string;
  institutionName?: string;
  showHashes?: boolean;
}

export const CertificateTemplate = forwardRef<HTMLDivElement, CertificateProps>(({
  studentName,
  rollNumber,
  degreeTitle,
  branch,
  cgpa,
  issueDate,
  credentialHash,
  merkleRoot,
  institutionName = "Decentralized Institute of Technology",
  showHashes = true
}, ref) => {

  const formattedDate = new Date(issueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Verification URL that the QR code points to
  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://vcred.io'}/verify/${credentialHash}?name=${encodeURIComponent(studentName)}&roll=${encodeURIComponent(rollNumber)}&cgpa=${cgpa}`;

  return (
    <div 
      ref={ref}
      // A4 wrapper for exact print dimensions (210mm x 297mm approx ratio)
      className="bg-white w-[210mm] min-h-[297mm] mx-auto relative overflow-hidden text-slate-900 shadow-2xl print:shadow-none"
      style={{
        boxSizing: 'border-box',
        padding: '20px',
      }}
    >
      {/* Outer Border */}
      <div className="w-full h-full border-[12px] border-slate-900 p-2 relative flex flex-col items-center">
        {/* Inner Border */}
        <div className="w-full h-full border-[4px] border-slate-900 p-12 relative flex flex-col items-center">
          
          {/* Top Decorative Elements */}
          <div className="absolute top-12 left-12 w-24 h-24 border-t-4 border-l-4 border-slate-300" />
          <div className="absolute top-12 right-12 w-24 h-24 border-t-4 border-r-4 border-slate-300" />
          
          {/* Header */}
          <div className="text-center mt-12 mb-16 uppercase tracking-[0.2em]">
            <h1 className="text-4xl font-serif font-bold text-slate-900 mb-4">{institutionName}</h1>
            <p className="text-sm font-semibold text-slate-500 tracking-widest">Global Academic Registry</p>
          </div>

          {/* Certificate Title */}
          <div className="text-center mb-16">
            <h2 className="text-6xl font-serif font-bold italic text-slate-800 mb-6 font-serif-display">
              Certificate of Academic Excellence
            </h2>
            <p className="text-lg text-slate-600 uppercase tracking-widest">
              THIS IS TO CERTIFY THAT
            </p>
          </div>

          {/* Student Name */}
          <div className="text-center mb-16 w-full max-w-2xl border-b-2 border-slate-300 pb-4">
            <h3 className="text-5xl font-script text-indigo-900 capitalize tracking-wide font-serif">
              {studentName}
            </h3>
          </div>

          {/* Body Text */}
          <div className="text-center max-w-3xl space-y-6 text-xl leading-relaxed text-slate-700 font-serif">
            <p>
              Bearing Roll Number <span className="font-bold font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded">{rollNumber}</span> has 
              satisfactorily completed all requirements and is hereby conferred the degree of
            </p>
            <p className="text-3xl font-bold text-slate-900 uppercase tracking-wider my-8">
              {degreeTitle}
            </p>
            <p>
              with a specialization in <span className="font-bold">{branch}</span>.
            </p>
            <p className="mt-8">
              Awarded this day with a Cumulative Grade Point Average of <span className="font-bold text-2xl">{cgpa.toFixed(2)}</span>.
            </p>
          </div>

          {/* Signatures & Seal Area */}
          <div className="w-full flex justify-between items-end mt-24 px-12">
            <div className="text-center">
              <div className="w-48 border-b border-slate-900 mb-2"></div>
              <p className="font-semibold uppercase tracking-wider text-sm text-slate-600">President / Chancellor</p>
            </div>

            {/* Central Seal Indicator */}
            <div className="flex flex-col items-center justify-center translate-y-8">
              <div className="w-32 h-32 rounded-full border-4 border-double border-indigo-900/40 flex items-center justify-center p-2">
                <div className="w-full h-full rounded-full bg-indigo-50 flex items-center justify-center text-center p-4">
                  <span className="font-serif text-xs font-bold text-indigo-900 uppercase absolute rotate-[-45deg]">
                    VCred
                    <br/>
                    Verified
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="w-48 border-b border-slate-900 mb-2 font-mono text-slate-800 pt-8" style={{ fontSize: '1.2rem', fontFamily: 'Dancing Script, cursive', lineHeight: '1rem' }}>
                Digitally Signed
              </div>
              <p className="font-semibold uppercase tracking-wider text-sm text-slate-600">Smart Issuance Protocol</p>
            </div>
          </div>

          {/* Bottom Metatadata & QR Code Wrapper */}
          <div className="absolute bottom-8 left-12 right-12 flex justify-between items-end border-t border-slate-200 pt-6">
            
            {/* Hash Footprint */}
            <div className="space-y-2 max-w-md">
              {showHashes && (
                <>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">On-Chain Cryptographic Proofs</p>
                  
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider">Credential Leaf Hash</span>
                    <span className="font-mono text-[10px] text-slate-500 break-all bg-slate-50 p-1 mt-0.5">
                      {credentialHash}
                    </span>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider">Batch Merkle Root</span>
                    <span className="font-mono text-[10px] text-slate-500 break-all bg-slate-50 p-1 mt-0.5">
                      {merkleRoot}
                    </span>
                  </div>
                </>
              )}
              
              <p className="text-[10px] text-slate-500 mt-2">
                Issued: <span className="font-bold">{formattedDate}</span>
              </p>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center border border-slate-200 p-2 bg-slate-50">
              <QRCodeSVG 
                value={verifyUrl}
                size={96}
                level="H"
                includeMargin={false}
                bgColor="#f8fafc"
                fgColor="#0f172a"
              />
              <p className="text-[8px] uppercase tracking-widest text-slate-500 font-bold mt-2">Scan to Verify</p>
            </div>

          </div>

          <div className="absolute bottom-12 left-12 w-24 h-24 border-b-4 border-l-4 border-slate-300" />
          <div className="absolute bottom-12 right-12 w-24 h-24 border-b-4 border-r-4 border-slate-300" />
        </div>
      </div>
    </div>
  );
});

CertificateTemplate.displayName = 'CertificateTemplate';
