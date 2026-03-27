"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  ArrowRight, 
  ArrowLeft,
  Cpu,
  Hash,
  FileSearch,
  Palette,
  Lock,
  AlertCircle
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Mock verification status - in real app this would come from context/API
const INSTITUTION_VERIFIED = true

interface ExtractedData {
  studentName: string
  studentId: string
  degree: string
  major: string
  graduationDate: string
  gpa: string
}

const mockExtractedData: ExtractedData[] = [
  { studentName: "Alex Johnson", studentId: "STU-2024-001", degree: "Bachelor of Science", major: "Computer Science", graduationDate: "May 2024", gpa: "3.85" },
  { studentName: "Maria Garcia", studentId: "STU-2024-002", degree: "Master of Arts", major: "Psychology", graduationDate: "May 2024", gpa: "3.92" },
  { studentName: "James Wilson", studentId: "STU-2024-003", degree: "Bachelor of Arts", major: "Economics", graduationDate: "May 2024", gpa: "3.67" },
  { studentName: "Emily Brown", studentId: "STU-2024-004", degree: "Bachelor of Science", major: "Biology", graduationDate: "May 2024", gpa: "3.78" },
]

const certificateTemplates = [
  { id: 0, name: "Upload Custom Template", description: "Use your own custom credential design" },
  { id: 1, name: "Classic Academic", description: "Traditional formal design with serif typography" },
  { id: 2, name: "Modern Minimal", description: "Clean, contemporary design with bold accents" },
  { id: 3, name: "Prestigious Gold", description: "Elegant design with gold foil elements" },
  { id: 4, name: "Tech Graduate", description: "Modern design for STEM programs" },
]

export default function CreateCredentialPage() {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [isMinting, setIsMinting] = useState(false)
  const [mintingProgress, setMintingProgress] = useState(0)

  // If institution is not verified, show locked overlay
  if (!INSTITUTION_VERIFIED) {
    return (
      <>
        <DashboardHeader 
          title="Create Credential" 
          description="AI-powered credential issuance"
          userName="SC"
        />
        <div className="relative p-6">
          {/* Blurred Content */}
          <div className="pointer-events-none blur-sm">
            <div className="rounded-xl border border-border/50 bg-card/50 p-16 text-center">
              <div className="mx-auto h-20 w-20 rounded-2xl bg-secondary" />
              <div className="mx-auto mt-6 h-6 w-48 rounded bg-secondary" />
              <div className="mx-auto mt-2 h-4 w-64 rounded bg-secondary" />
            </div>
          </div>

          {/* Locked Overlay */}
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-border/50 bg-card/95 p-8 text-center shadow-2xl backdrop-blur"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
                <Lock className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold">Access Restricted</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Your institution is currently under review by VCRED HQ. 
                You&apos;ll be able to issue credentials once verified.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-warning/10 px-4 py-2 text-sm text-warning">
                <AlertCircle className="h-4 w-4" />
                Verification Pending
              </div>
            </motion.div>
          </div>
        </div>
      </>
    )
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileUpload(droppedFile)
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileUpload(selectedFile)
    }
  }

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile)
    setStep(2)
    
    // Simulate AI processing steps
    const steps = ["Extracting", "Mapping", "Hashing"]
    for (let i = 0; i < steps.length; i++) {
      setProcessingStep(i + 1)
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
    
    setExtractedData(mockExtractedData)
    setStep(3)
  }

  const handleMintBatch = async () => {
    setIsMinting(true)
    setMintingProgress(0)
    
    // Simulate minting progress
    for (let i = 0; i <= 100; i += 5) {
      setMintingProgress(i)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    setIsMinting(false)
    setStep(5) // Success
  }

  const processingSteps = [
    { label: "Extracting", description: "OCR processing transcript data", icon: FileSearch },
    { label: "Mapping", description: "Validating against schema", icon: Cpu },
    { label: "Hashing", description: "Generating Merkle proofs", icon: Hash },
  ]

  return (
    <>
      <DashboardHeader 
        title="Create Credential" 
        description="AI-powered credential issuance"
        userName="SC"
      />

      <div className="p-6">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {["Upload", "Processing", "Template", "Review", "Complete"].map((label, i) => (
              <div key={label} className="flex items-center">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  step > i + 1 ? "bg-primary text-primary-foreground" :
                  step === i + 1 ? "bg-primary text-primary-foreground" :
                  "bg-secondary text-muted-foreground"
                )}>
                  {step > i + 1 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                {i < 4 && (
                  <div className={cn(
                    "hidden h-0.5 w-16 sm:block lg:w-24",
                    step > i + 1 ? "bg-primary" : "bg-secondary"
                  )} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            {["Upload", "Processing", "Template", "Review", "Complete"].map((label) => (
              <span key={label} className="w-8 text-center">{label}</span>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Upload */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "relative rounded-2xl border-2 border-dashed p-16 text-center transition-all",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border/50 bg-card/30 hover:border-border hover:bg-card/50"
                )}
              >
                <input
                  type="file"
                  onChange={handleFileInput}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  accept=".pdf,.csv,.xlsx"
                />
                <div className="pointer-events-none">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                    <Upload className={cn("h-10 w-10", isDragging ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <h3 className="text-xl font-semibold">Upload Transcripts</h3>
                  <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                    Drag and drop your PDF transcripts or CSV student data. 
                    Our AI will automatically extract and validate the information.
                  </p>
                  <Button variant="outline" className="mt-6 pointer-events-none">
                    Browse Files
                  </Button>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {["PDF Transcripts", "CSV Data", "Excel Spreadsheets"].map((format) => (
                  <div key={format} className="rounded-xl border border-border/50 bg-card/30 p-4 text-center">
                    <FileText className="mx-auto h-6 w-6 text-muted-foreground" />
                    <p className="mt-2 text-sm">{format}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: AI Processing */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mx-auto max-w-2xl"
            >
              <div className="rounded-2xl border border-border/50 bg-card/50 p-8 backdrop-blur">
                <div className="text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <Cpu className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Agentic AI Processing</h3>
                  <p className="mt-2 text-muted-foreground">
                    Processing {file?.name}
                  </p>
                </div>

                <div className="mt-8 space-y-4">
                  {processingSteps.map((pStep, i) => {
                    const isActive = processingStep === i + 1
                    const isComplete = processingStep > i + 1

                    return (
                      <div
                        key={pStep.label}
                        className={cn(
                          "flex items-center gap-4 rounded-xl border p-4 transition-all",
                          isComplete ? "border-primary/50 bg-primary/5" :
                          isActive ? "border-primary bg-primary/10" :
                          "border-border/50 bg-secondary/30"
                        )}
                      >
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          isComplete ? "bg-primary text-primary-foreground" :
                          isActive ? "bg-primary/20 text-primary" :
                          "bg-secondary text-muted-foreground"
                        )}>
                          {isComplete ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : isActive ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <pStep.icon className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={cn(
                            "font-medium",
                            isActive || isComplete ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {pStep.label}
                          </p>
                          <p className="text-sm text-muted-foreground">{pStep.description}</p>
                        </div>
                        {isComplete && (
                          <span className="text-sm text-primary">Complete</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Template Selection */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center">
                <h3 className="text-xl font-semibold">Select Certificate Template</h3>
                <p className="mt-2 text-muted-foreground">
                  Choose a design template for your credentials
                </p>
              </div>

              <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {certificateTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={cn(
                      "group relative rounded-2xl border p-4 text-left transition-all",
                      selectedTemplate === template.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border/50 bg-card/30 hover:border-border hover:bg-card/50"
                    )}
                  >
                    {/* Template Preview Placeholder */}
                    <div className={cn(
                      "aspect-[4/3] rounded-lg flex items-center justify-center",
                      template.id === 0 ? "bg-primary/10 border-2 border-dashed border-primary/30" : "bg-secondary/50"
                    )}>
                      {template.id === 0 ? (
                        <Upload className="h-8 w-8 text-primary" />
                      ) : (
                        <Palette className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <h4 className="mt-4 font-medium">{template.name}</h4>
                    <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
                    {selectedTemplate === template.id && (
                      <div className="absolute -right-2 -top-2 rounded-full bg-primary p-1">
                        <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => setStep(4)} disabled={!selectedTemplate}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Review & Mint */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center">
                <h3 className="text-xl font-semibold">Review & Mint Batch</h3>
                <p className="mt-2 text-muted-foreground">
                  Verify the extracted data before minting credentials
                </p>
              </div>

              {/* Data Grid */}
              <div className="mt-8 rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                <div className="grid grid-cols-6 gap-4 border-b border-border/50 bg-secondary/30 px-6 py-3 text-sm font-medium text-muted-foreground">
                  <span>Student Name</span>
                  <span>Student ID</span>
                  <span>Degree</span>
                  <span>Major</span>
                  <span>Graduation</span>
                  <span>GPA</span>
                </div>
                <div className="divide-y divide-border/50">
                  {extractedData.map((student, i) => (
                    <div key={i} className="grid grid-cols-6 gap-4 px-6 py-4 text-sm">
                      <span className="font-medium">{student.studentName}</span>
                      <span className="font-mono text-muted-foreground">{student.studentId}</span>
                      <span>{student.degree}</span>
                      <span>{student.major}</span>
                      <span>{student.graduationDate}</span>
                      <span>{student.gpa}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="mt-6 rounded-xl border border-border/50 bg-card/50 p-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Credentials</p>
                    <p className="text-2xl font-bold">{extractedData.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Template</p>
                    <p className="text-2xl font-bold">
                      {certificateTemplates.find(t => t.id === selectedTemplate)?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Gas</p>
                    <p className="text-2xl font-bold">~0.003 ETH</p>
                  </div>
                </div>
              </div>

              {/* Minting Progress */}
              {isMinting && (
                <div className="mt-6 rounded-xl border border-primary/50 bg-primary/5 p-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Minting credentials...</span>
                    <span className="text-primary">{mintingProgress}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${mintingProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setStep(3)} disabled={isMinting}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleMintBatch} disabled={isMinting} className="gap-2">
                  {isMinting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Minting...
                    </>
                  ) : (
                    <>
                      <Hash className="h-4 w-4" />
                      Mint Batch
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Success */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto max-w-xl text-center"
            >
              <div className="rounded-2xl border border-primary/50 bg-primary/5 p-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 ring-4 ring-primary/10"
                >
                  <CheckCircle2 className="h-10 w-10 text-primary" />
                </motion.div>
                <h3 className="mt-6 text-2xl font-bold">Batch Minted Successfully!</h3>
                <p className="mt-2 text-muted-foreground">
                  {extractedData.length} credentials have been issued and recorded on-chain.
                </p>
                <div className="mt-6 rounded-lg bg-background/50 p-4">
                  <p className="text-xs text-muted-foreground">Merkle Root</p>
                  <code className="mt-1 block font-mono text-sm">
                    0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
                  </code>
                </div>
                <div className="mt-8 flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => {
                    setStep(1)
                    setFile(null)
                    setExtractedData([])
                    setSelectedTemplate(null)
                    setProcessingStep(0)
                  }}>
                    Create Another
                  </Button>
                  <Button>View Records</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
