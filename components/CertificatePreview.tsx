"use client"

import React, { forwardRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export interface LayoutConfig {
  namePos?: { x: number, y: number }
  rollPos?: { x: number, y: number }
  qrPos?: { x: number, y: number }
  backgroundImage?: string
  width?: number
  height?: number
  fontSize?: number
  fontColor?: string
}

interface CertificatePreviewProps {
  templateId: string
  studentData: {
    name: string
    rollNumber: string
    degreeTitle: string
    branch: string
    cgpa: number
    institutionName: string
    issuedAt: string
    credentialHash: string
  }
  layoutConfig?: LayoutConfig
  showHashes?: boolean
}

export const CertificatePreview = forwardRef<HTMLDivElement, CertificatePreviewProps>(({
  templateId,
  studentData,
  layoutConfig,
  showHashes = true
}, ref) => {
  const { name, rollNumber, degreeTitle, branch, cgpa, institutionName, issuedAt, credentialHash } = studentData
  
  const formattedDate = new Date(issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Presets
  if (templateId === 'professional') {
    return (
      <div ref={ref} className="bg-white w-[800px] h-[1132px] border-[12px] border-slate-900 p-8 flex flex-col items-center text-slate-800 shadow-xl font-serif">
        <h1 className="text-4xl font-bold mt-12 text-center uppercase tracking-tighter">{institutionName}</h1>
        <div className="mt-20 text-center">
            <p className="text-xl uppercase tracking-widest text-slate-400">Certificate of Completion</p>
            <h2 className="text-6xl italic my-8 font-serif">Academic Excellence</h2>
        </div>
        <p className="text-lg">This is to certify that</p>
        <h3 className="text-5xl my-8 text-indigo-900 border-b-2 border-slate-200 pb-4 px-12 uppercase">{name}</h3>
        <p className="text-xl max-w-lg text-center leading-relaxed">
            has successfully completed the requirements for <br/>
            <span className="font-bold text-2xl">{degreeTitle}</span> in <span className="font-bold">{branch}</span>
            <br/> with a Cumulative GPA of <span className="text-2xl font-bold">{cgpa.toFixed(2)}</span>
        </p>
        <div className="mt-auto w-full flex justify-between items-end pb-12 px-8">
            <div className="text-center border-t border-slate-300 pt-2 w-40 text-sm">Registrar</div>
            <div className="flex flex-col items-center">
                <QRCodeSVG value={credentialHash} size={80} />
                {showHashes && <p className="text-[10px] mt-2 text-slate-400">Verify on Blockchain</p>}
            </div>
            <div className="text-center border-t border-slate-300 pt-2 w-40 text-sm">Principal</div>
        </div>
      </div>
    )
  }

  if (templateId === 'minimal') {
    return (
      <div ref={ref} className="bg-neutral-50 w-[800px] h-[1132px] p-16 flex flex-col text-neutral-900 shadow-xl font-sans">
        <div className="border-l-8 border-neutral-900 pl-8">
            <h1 className="text-3xl font-black uppercase tracking-tighter">{institutionName}</h1>
            <p className="text-neutral-500 text-sm mt-1">Official Academic Registry</p>
        </div>
        <div className="mt-32">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-400 mb-4">Credential Holder</p>
            <h2 className="text-7xl font-light tracking-tight">{name}</h2>
            <p className="text-xl mt-4 text-neutral-500">Roll No: {rollNumber}</p>
        </div>
        <div className="mt-20 space-y-4">
            <p className="text-2xl font-medium">{degreeTitle}</p>
            <p className="text-lg text-neutral-600">Specialization in {branch}</p>
            <p className="text-4xl font-black mt-8">GPA {cgpa.toFixed(2)}</p>
        </div>
        <div className="mt-auto flex justify-between items-end border-t border-neutral-200 pt-8">
            <div className="text-sm text-neutral-400">
                <p>Issued: {formattedDate}</p>
                <p className="font-mono mt-1 select-all">{(credentialHash || "0x_PREVIEW_HASH_").substring(0, 16)}...</p>
            </div>
            <QRCodeSVG value={credentialHash || "0xPREVIEW_CREDENTIAL_HASH"} size={100} level="H" />
        </div>
      </div>
    )
  }

  if (templateId === 'elegant') {
    return (
      <div ref={ref} className="bg-[#fcfaf5] w-[800px] h-[1132px] p-12 flex flex-col items-center shadow-lg font-serif text-slate-900 border-[16px] border-double border-amber-600/60 relative">
        <div className="absolute inset-4 border border-amber-600/30"></div>
        <h1 className="text-3xl font-bold mt-16 text-center uppercase tracking-[0.2em] text-amber-900">{institutionName}</h1>
        <div className="mt-20">
            <h2 className="text-6xl text-center italic" style={{ fontFamily: 'Georgia, serif' }}>Certificate of Excellence</h2>
        </div>
        <p className="text-lg italic text-slate-600 mt-12 mb-6">Proudly presented to</p>
        <h3 className="text-5xl font-bold text-amber-900 mb-8 border-b border-amber-300 pb-2">{name}</h3>
        <p className="text-xl max-w-lg text-center leading-relaxed text-slate-700">
            For outstanding academic performance and the successful completion of <br/>
            <span className="font-bold text-2xl text-amber-900">{degreeTitle}</span> in <span className="font-bold">{branch}</span>
            <br/> with a Cumulative GPA of <span className="text-2xl font-bold text-amber-900">{cgpa.toFixed(2)}</span>
        </p>
        <div className="mt-auto w-full flex justify-between items-end pb-8 px-12">
            <div className="text-center w-32 border-t border-slate-400 pt-2 text-sm italic">Registrar</div>
            <div className="flex flex-col items-center">
                <QRCodeSVG value={credentialHash || "0xPREVIEW_CREDENTIAL_HASH"} size={90} fgColor="#78350f" />
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-2 font-sans flex flex-col items-center gap-1">
                  <span>Verified Credentials</span>
                </p>
            </div>
            <div className="text-center w-32 border-t border-slate-400 pt-2 text-sm italic">President</div>
        </div>
      </div>
    )
  }

  if (templateId === 'vibrant') {
    return (
      <div ref={ref} className="bg-slate-950 w-[800px] h-[1132px] p-0 flex flex-col text-white shadow-2xl font-sans relative overflow-hidden">
        <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-purple-600 rounded-full blur-[100px] opacity-50"></div>
        <div className="absolute bottom-[-100px] left-[-100px] w-96 h-96 bg-blue-600 rounded-full blur-[100px] opacity-50"></div>
        
        <div className="relative z-10 p-16 flex flex-col h-full">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 uppercase tracking-tighter">{institutionName}</h1>
                    <p className="text-slate-400 text-sm mt-2 tracking-widest uppercase">Verified Web3 Credential</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                    <QRCodeSVG value={credentialHash || "0xPREVIEW_CREDENTIAL_HASH"} size={80} bgColor="transparent" fgColor="#fff" level="H" />
                </div>
            </div>

            <div className="mt-32">
                <p className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-4">Awarded To</p>
                <h2 className="text-7xl font-bold tracking-tight mb-4">{name}</h2>
                <div className="inline-block px-4 py-1 rounded-full bg-white/10 border border-white/10 text-sm font-mono text-purple-300">
                    ID: {rollNumber}
                </div>
            </div>

            <div className="mt-16 space-y-6">
                <div>
                    <p className="text-sm text-slate-400 uppercase tracking-widest mb-1">Degree Program</p>
                    <p className="text-3xl font-medium">{degreeTitle}</p>
                </div>
                <div>
                    <p className="text-sm text-slate-400 uppercase tracking-widest mb-1">Specialization</p>
                    <p className="text-2xl text-slate-300">{branch}</p>
                </div>
                <div>
                    <p className="text-sm text-slate-400 uppercase tracking-widest mb-1">Final GPA</p>
                    <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">{cgpa.toFixed(2)}</p>
                </div>
            </div>

            <div className="mt-auto border-t border-white/10 pt-8 flex justify-between items-center text-sm text-slate-400">
                <p>Issued: {formattedDate}</p>
            </div>
        </div>
      </div>
    )
  }

  if (templateId === 'academic') {
    return (
      <div ref={ref} className="bg-[#fef8e7] w-[800px] h-[1132px] p-2 flex flex-col shadow-xl font-serif text-[#2a1313] border-[1px] border-amber-900/10 relative">
        <div className="absolute inset-4 border-[6px] border-[#6b2525]"></div>
        <div className="absolute inset-6 border border-[#6b2525]/30"></div>
        
        <div className="relative z-10 flex flex-col items-center h-full pt-20 px-16 pb-16 text-center">
            <h1 className="text-4xl font-extrabold uppercase tracking-[0.15em] text-[#6b2525] mb-2">{institutionName}</h1>
            <p className="text-sm font-bold uppercase tracking-widest opacity-60">Office of the University Registrar</p>
            
            <div className="my-16">
                <h2 className="text-6xl italic text-[#6b2525]">Diploma of Graduation</h2>
            </div>
            
            <p className="text-lg">The Trustees of the University,<br/>on the recommendation of the Faculty, have conferred upon</p>
            
            <h3 className="text-6xl font-bold my-8 text-[#2a1313]">{name}</h3>
            
            <p className="text-lg leading-relaxed max-w-lg mx-auto">
                the degree of <br/>
                <span className="font-bold text-3xl font-sans mt-2 block">{degreeTitle}</span>
                <span className="italic block mt-2 text-xl">in {branch}</span>
            </p>
            
            <p className="mt-8 text-xl">
                with all the Rights, Privileges, and Honors thereunto appertaining. <br/>
                <span className="font-bold block mt-4">Cum Laude (GPA: {cgpa.toFixed(2)})</span>
            </p>

            <div className="w-full flex justify-between items-end mt-auto px-8">
                <div className="text-center w-40">
                    <div className="border-b border-[#2a1313] mb-2 pb-6">
                         <span className="font-signature text-3xl text-slate-600 block">J. Smith</span>
                    </div>
                    <span className="text-xs uppercase tracking-widest font-bold">University President</span>
                </div>
                <div className="flex flex-col items-center pb-4">
                    <div className="p-2 border-2 border-[#6b2525] rounded bg-white">
                        <QRCodeSVG value={credentialHash || "0xPREVIEW_CREDENTIAL_HASH"} size={80} fgColor="#6b2525" />
                    </div>
                </div>
                <div className="text-center w-40">
                     <div className="border-b border-[#2a1313] mb-2 pb-6">
                         <span className="font-signature text-3xl text-slate-600 block">A. Doe</span>
                    </div>
                    <span className="text-xs uppercase tracking-widest font-bold">University Registrar</span>
                </div>
            </div>
        </div>
      </div>
    )
  }

  // Fallback to default modern
  return (
    <div ref={ref} className="bg-white w-[800px] h-[1132px] p-2 flex flex-col shadow-xl font-sans text-slate-900 border-[1px] border-slate-100">
        <div className="h-40 w-full bg-slate-900 flex items-center justify-center text-white px-12">
            <h1 className="text-3xl font-bold tracking-widest uppercase">{institutionName}</h1>
        </div>
        <div className="flex-1 p-16 flex flex-col items-center text-center">
            <div className="w-24 h-1 bg-indigo-600 mb-12"></div>
            <h2 className="text-5xl font-black mb-4">Official Certificate</h2>
            <p className="text-slate-500 uppercase tracking-widest text-sm mb-16">VCred Document ID: {rollNumber}</p>
            
            <p className="text-xl italic font-serif">This certifies that</p>
            <p className="text-6xl font-bold my-6 text-slate-950">{name}</p>
            <p className="text-lg text-slate-600 max-w-lg mb-12">
                Successfully demonstrated academic excellence in the field of <span className="font-bold text-slate-900">{branch}</span>
                and is hereby conferred the degree of <span className="font-bold text-slate-900">{degreeTitle}</span>.
            </p>

            <div className="grid grid-cols-2 gap-12 w-full mt-12 text-sm uppercase tracking-widest font-bold text-slate-400">
                <div className="border-t border-slate-200 pt-4">Final Grade: <span className="text-slate-900">{cgpa.toFixed(2)}</span></div>
                <div className="border-t border-slate-200 pt-4">Date: <span className="text-slate-900">{formattedDate}</span></div>
            </div>
        </div>
        <div className="h-32 w-full bg-slate-50 flex items-center justify-between px-16 border-t border-slate-200">
             <div className="text-[10px] text-slate-400 font-mono">
                {showHashes ? credentialHash : ""}
             </div>
             <QRCodeSVG value={credentialHash} size={60} />
        </div>
    </div>
  )
})

CertificatePreview.displayName = 'CertificatePreview'
