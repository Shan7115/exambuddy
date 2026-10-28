"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  FileUp,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  BookOpen,
  User,
  Sparkles,
  Camera,
  RefreshCw,
} from "lucide-react";
import {
  CANONICAL_EXAM_CENTERS,
  DEFAULT_EXAM_DATE,
  EXAM_SESSIONS,
  SAMPLE_PRESENTERS,
  type CanonicalCenter,
} from "@/lib/constants/demo-data";
import type { SessionUser } from "@/lib/auth/session";
import type { ExtractedTicket } from "@/lib/agents/intake-agent";
import { BarcodeValidationBadge, type BarcodeStatus } from "@/components/BarcodeValidationBadge";
import { decodeBarcodeFromImage, isBarcodeValidationEnabled } from "@/lib/barcode/zxing";

interface AgentStep {
  id: string;
  label: string;
  status: "waiting" | "running" | "done" | "failed";
}

const INITIAL_STEPS: AgentStep[] = [
  { id: "1", label: "Reading hall ticket layout with Gemini Vision", status: "waiting" },
  { id: "2", label: "Extracting register number, course, and exam venue", status: "waiting" },
  { id: "3", label: "Mapping to Coimbatore canonical exam centers", status: "waiting" },
  { id: "4", label: "Verifying student credentials against signed-in account", status: "waiting" },
];

export default function TicketUploadPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedSampleFile, setSelectedSampleFile] = useState<string | null>(null);

  // Barcode validation state
  const [barcodeStatus, setBarcodeStatus] = useState<BarcodeStatus>("idle");
  const [decodedBarcode, setDecodedBarcode] = useState<string | null>(null);

  // Processing & Agent steps
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>(INITIAL_STEPS);

  // Extraction Result state
  const [extractedData, setExtractedData] = useState<ExtractedTicket | null>(null);
  const [mismatchError, setMismatchError] = useState<string | null>(null);

  // Confirmation Card editable state
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [examCenter, setExamCenter] = useState(CANONICAL_EXAM_CENTERS[0].name);
  const [examDate, setExamDate] = useState(DEFAULT_EXAM_DATE);
  const [session, setSession] = useState<"Forenoon" | "Afternoon">("Forenoon");
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          router.push("/");
        }
      })
      .catch(() => router.push("/"))
      .finally(() => setLoadingUser(false));
  }, [router]);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setSelectedSampleFile(null);
      setMismatchError(null);
      setExtractedData(null);
      const url = URL.createObjectURL(selected);
      setPreviewUrl(url);
    }
  };

  // Quick preset sample ticket select
  const handleSelectSample = (sampleFilename: string) => {
    setSelectedSampleFile(sampleFilename);
    setFile(null);
    setMismatchError(null);
    setExtractedData(null);
    setPreviewUrl(`/sample-tickets/${sampleFilename}`);
  };

  // Process ticket through Intake Agent
  const handleProcessTicket = async () => {
    if (!file && !selectedSampleFile) return;

    setIsProcessing(true);
    setMismatchError(null);
    setConfirmError(null);

    // Reset steps
    setSteps([
      { id: "1", label: "Reading hall ticket layout with Gemini Vision", status: "running" },
      { id: "2", label: "Extracting register number, course, and exam venue", status: "waiting" },
      { id: "3", label: "Mapping to Coimbatore canonical exam centers", status: "waiting" },
      { id: "4", label: "Verifying student credentials against signed-in account", status: "waiting" },
    ]);

    // Run Barcode validation if enabled
    if (isBarcodeValidationEnabled() && previewUrl) {
      setBarcodeStatus("scanning");
      decodeBarcodeFromImage(previewUrl)
        .then(({ text }) => {
          if (text) {
            setDecodedBarcode(text);
            const cleanExpected = user?.registerNo ? user.registerNo.toUpperCase().trim() : "";
            if (
              cleanExpected &&
              (text.toUpperCase().includes(cleanExpected) ||
                cleanExpected.includes(text.toUpperCase()))
            ) {
              setBarcodeStatus("matched");
            } else {
              setBarcodeStatus("unverified");
            }
          } else {
            setBarcodeStatus("unverified");
          }
        })
        .catch(() => {
          setBarcodeStatus("unverified");
        });
    }

    try {
      // Step 1 animation tick
      setTimeout(() => {
        setSteps((prev) => [
          { ...prev[0], status: "done" },
          { ...prev[1], status: "running" },
          prev[2],
          prev[3],
        ]);
      }, 500);

      const formData = new FormData();
      if (selectedSampleFile) {
        formData.append("sampleId", selectedSampleFile);
      } else if (file) {
        formData.append("file", file);
      }

      const res = await fetch("/api/tickets/intake", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      // Step 2 & 3 tick
      setSteps((prev) => [
        { ...prev[0], status: "done" },
        { ...prev[1], status: "done" },
        { ...prev[2], status: "running" },
        prev[3],
      ]);

      await new Promise((r) => setTimeout(r, 400));

      if (!res.ok) {
        setSteps((prev) => [
          { ...prev[0], status: "done" },
          { ...prev[1], status: "done" },
          { ...prev[2], status: "failed" },
          { ...prev[3], status: "failed" },
        ]);
        setMismatchError(data.error || "Failed to extract hall ticket details.");
        setIsProcessing(false);
        return;
      }

      if (data.isMismatch) {
        setSteps((prev) => [
          { ...prev[0], status: "done" },
          { ...prev[1], status: "done" },
          { ...prev[2], status: "done" },
          { ...prev[3], status: "failed" },
        ]);
        setMismatchError(
          data.mismatchReason ||
            "The register number on this ticket does not match your signed-in Karunya account."
        );
        setIsProcessing(false);
        return;
      }

      // Step 4 tick done
      setSteps((prev) => [
        { ...prev[0], status: "done" },
        { ...prev[1], status: "done" },
        { ...prev[2], status: "done" },
        { ...prev[3], status: "done" },
      ]);

      const extracted: ExtractedTicket = data.extracted;
      setExtractedData(extracted);
      setCourseName(extracted.courseName);
      setCourseCode(extracted.courseCode);
      setExamCenter(extracted.canonicalCenter.name);
      setExamDate(extracted.examDate);
      setSession(extracted.session);
    } catch {
      setMismatchError("Network error while connecting to Intake Agent.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit confirmed ticket
  const handleConfirmDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim() || !examCenter.trim() || !examDate.trim()) {
      setConfirmError("Please complete all required fields.");
      return;
    }

    setIsConfirming(true);
    setConfirmError(null);

    try {
      const res = await fetch("/api/tickets/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseName,
          examCenter,
          examDate,
          session,
          extractedJson: extractedData?.rawJson || {
            courseCode,
            reportingTime: session === "Forenoon" ? "07:30 AM" : "12:30 PM",
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setConfirmError(data.error || "Could not save confirmed ticket.");
        setIsConfirming(false);
        return;
      }

      // Redirect to Dashboard (ready for Stage 4 matching)
      router.push("/dashboard");
    } catch {
      setConfirmError("Network error while confirming ticket.");
    } finally {
      setIsConfirming(false);
    }
  };

  if (loadingUser || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFD]">
        <Loader2 className="w-8 h-8 text-[#0071E3] animate-spin" />
      </div>
    );
  }

  // Find sample ticket corresponding to current presenter
  const mySamplePresenter = SAMPLE_PRESENTERS.find(
    (p) => p.registerNo.toUpperCase() === user.registerNo.toUpperCase()
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD] text-[#1D1D1F]">
      <Navbar user={user} onOpenSignIn={() => {}} onSignOut={() => router.push("/")} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-[12px] font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Intake Agent
          </div>
          <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[#1D1D1F]">
            Upload your NPTEL hall ticket
          </h1>
          <p className="text-[16px] text-[#6E6E73] mt-1">
            Signed in as <span className="font-semibold text-[#1D1D1F]">{user.name}</span> (
            <span className="font-mono text-[#1D1D1F]">{user.registerNo}</span>).
          </p>
        </div>

        {/* 1-Tap Sample Preset Banner for Live Demo */}
        <div className="bg-[#F5F5F7] rounded-2xl p-4 border border-[#D2D2D7]/60 mb-8">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <span className="text-[13px] font-medium text-[#1D1D1F] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#0071E3]" />
              Live Demo Hall Tickets (1-tap selection):
            </span>
            <span className="text-[11px] text-[#6E6E73]">
              Pre-configured NPTEL tickets for the 4 presentation devices
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SAMPLE_PRESENTERS.map((p, idx) => {
              const filename = `ticket-${idx + 1}-${p.registerNo.toLowerCase()}.svg`;
              const isSelected = selectedSampleFile === filename;
              const isMe = p.registerNo.toUpperCase() === user.registerNo.toUpperCase();

              return (
                <button
                  key={p.registerNo}
                  type="button"
                  onClick={() => handleSelectSample(filename)}
                  className={`text-left p-2.5 rounded-xl text-[12px] border transition-all ${
                    isSelected
                      ? "bg-[#0071E3] text-white border-[#0071E3] shadow-xs"
                      : isMe
                      ? "bg-white border-[#0071E3] text-[#1D1D1F] ring-1 ring-[#0071E3]"
                      : "bg-white hover:bg-white/80 border-[#D2D2D7]/60 text-[#1D1D1F]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold truncate">
                      P{idx + 1}: {p.name}
                    </span>
                    {isMe && !isSelected && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#0071E3]/15 text-[#0071E3] font-bold">
                        YOU
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[11px] font-mono mt-0.5 truncate ${
                      isSelected ? "text-white/80" : "text-[#6E6E73]"
                    }`}
                  >
                    {p.registerNo}
                  </div>
                  <div
                    className={`text-[10px] mt-1 truncate ${
                      isSelected ? "text-white/75" : "text-[#6E6E73]"
                    }`}
                  >
                    {p.examCenter.split(" ")[0]} • {p.session}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Grid: Upload Zone / Preview vs Confirmation Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Upload & Live Agent Progress */}
          <div className="md:col-span-5 space-y-6">
            {/* File Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
                previewUrl
                  ? "border-[#0071E3] bg-[#0071E3]/5"
                  : "border-[#D2D2D7] hover:border-[#0071E3]/60 bg-white"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.svg,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />

              {previewUrl ? (
                <div className="w-full flex flex-col items-center">
                  <div className="relative w-full max-h-[180px] overflow-hidden rounded-xl border border-[#D2D2D7]/60 mb-3 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Hall ticket preview"
                      className="w-full h-auto max-h-[180px] object-contain mx-auto"
                    />
                  </div>
                  <div className="text-[13px] font-medium text-[#1D1D1F] flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-[#34C759]" />
                    {selectedSampleFile ? selectedSampleFile : file?.name}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="text-[12px] text-[#0071E3] hover:underline mt-1"
                  >
                    Change ticket
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] text-[#0071E3] flex items-center justify-center mb-3">
                    <FileUp className="w-6 h-6" />
                  </div>
                  <div className="text-[15px] font-semibold text-[#1D1D1F]">
                    Click or drop your hall ticket here
                  </div>
                  <p className="text-[13px] text-[#6E6E73] mt-1 max-w-xs">
                    Supports PNG, JPG, or SVG image files directly from NPTEL portal.
                  </p>
                </>
              )}
            </div>

            {/* Scan Action Button */}
            <button
              type="button"
              disabled={(!file && !selectedSampleFile) || isProcessing}
              onClick={handleProcessTicket}
              className="w-full min-h-[48px] px-6 py-3 rounded-full bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.98] text-white font-medium text-[15px] flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Intake Agent reading ticket...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Scan hall ticket with AI
                </>
              )}
            </button>

            {/* Live Agent Progress List */}
            <div className="bg-white rounded-2xl p-5 border border-[#D2D2D7]/60 shadow-xs">
              <div className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Agent Activity Stream</span>
                <span className="text-[#0071E3] font-medium">Intake Agent</span>
              </div>

              <div className="space-y-3">
                {steps.map((st) => (
                  <div key={st.id} className="flex items-start gap-3 text-[13px]">
                    <div className="shrink-0 mt-0.5">
                      {st.status === "running" && (
                        <Loader2 className="w-4 h-4 text-[#0071E3] animate-spin" />
                      )}
                      {st.status === "done" && (
                        <div className="w-4 h-4 rounded-full bg-[#34C759]/20 text-[#34C759] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                      {st.status === "failed" && (
                        <div className="w-4 h-4 rounded-full bg-[#FF3B30]/20 text-[#FF3B30] flex items-center justify-center">
                          <AlertCircle className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      )}
                      {st.status === "waiting" && (
                        <div className="w-4 h-4 rounded-full border border-[#D2D2D7]" />
                      )}
                    </div>
                    <span
                      className={`${
                        st.status === "running"
                          ? "text-[#0071E3] font-medium"
                          : st.status === "done"
                          ? "text-[#1D1D1F]"
                          : st.status === "failed"
                          ? "text-[#FF3B30] font-medium"
                          : "text-[#6E6E73]"
                      }`}
                    >
                      {st.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Editable Confirmation Card OR Mismatch Alert */}
          <div className="md:col-span-7">
            {/* Identity Mismatch Rejection Card */}
            {mismatchError && (
              <div
                className="rounded-3xl bg-red-50 border border-red-200 p-6 text-red-900 shadow-xs space-y-4"
                role="alert"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6 text-[#FF3B30]" />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-semibold text-[#1D1D1F]">
                      Ticket verification rejected
                    </h3>
                    <p className="text-[14px] text-red-800 mt-1 leading-relaxed">
                      {mismatchError}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-red-200/80 text-[13px] text-[#1D1D1F] space-y-1">
                  <div className="font-semibold text-red-900 mb-1">How to fix this:</div>
                  <div>• Ensure you upload your own personal NPTEL admit card.</div>
                  <div>• If testing with demo roles, select the sample ticket matching your signed-in ID ({user.registerNo}).</div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (mySamplePresenter) {
                        const filename = `ticket-${SAMPLE_PRESENTERS.findIndex(
                          (p) => p.registerNo === mySamplePresenter.registerNo
                        ) + 1}-${mySamplePresenter.registerNo.toLowerCase()}.svg`;
                        handleSelectSample(filename);
                      }
                      setMismatchError(null);
                    }}
                    className="px-4 py-2 rounded-full bg-[#0071E3] text-white text-[13px] font-medium hover:bg-[#0077ED] transition-colors"
                  >
                    Select my matching sample ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMismatchError(null);
                      setFile(null);
                      setPreviewUrl(null);
                      setSelectedSampleFile(null);
                    }}
                    className="px-4 py-2 rounded-full bg-white border border-[#D2D2D7] text-[13px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
                  >
                    Try another file
                  </button>
                </div>
              </div>
            )}

            {/* Editable Confirmation Card */}
            {!mismatchError && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D2D2D7]/70 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-[#D2D2D7]/50 mb-6">
                  <div>
                    <h2 className="text-[20px] font-semibold text-[#1D1D1F]">
                      Confirm hall ticket details
                    </h2>
                    <p className="text-[13px] text-[#6E6E73] mt-0.5">
                      Verify or edit the extracted details before grouping.
                    </p>
                  </div>
                  {extractedData && (
                    <span className="px-3 py-1 rounded-full bg-[#34C759]/15 text-[#34C759] text-[12px] font-semibold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      Extracted
                    </span>
                  )}
                </div>

                {confirmError && (
                  <div className="mb-5 rounded-2xl bg-red-50 border border-red-200 p-3.5 text-[13px] text-red-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#FF3B30] shrink-0" />
                    <span>{confirmError}</span>
                  </div>
                )}

                {/* Optional Barcode Validation Badge */}
                {barcodeStatus !== "idle" && (
                  <div className="mb-5">
                    <BarcodeValidationBadge
                      status={barcodeStatus}
                      decodedValue={decodedBarcode}
                      expectedRegisterNo={user.registerNo}
                    />
                  </div>
                )}

                <form onSubmit={handleConfirmDetails} className="space-y-5">
                  {/* Student Details (Protected) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-medium text-[#6E6E73] mb-1">
                        Candidate name
                      </label>
                      <div className="h-11 px-3.5 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7]/50 text-[14px] font-medium text-[#1D1D1F] flex items-center">
                        {user.name}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-[#6E6E73] mb-1">
                        Karunya register number
                      </label>
                      <div className="h-11 px-3.5 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7]/50 text-[14px] font-mono font-medium text-[#1D1D1F] flex items-center">
                        {user.registerNo}
                      </div>
                    </div>
                  </div>

                  {/* Course Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="courseName"
                        className="block text-[12px] font-medium text-[#1D1D1F] mb-1"
                      >
                        Course title
                      </label>
                      <input
                        id="courseName"
                        type="text"
                        value={courseName}
                        onChange={(e) => setCourseName(e.target.value)}
                        placeholder="e.g. Cloud Computing and Distributed Systems"
                        required
                        className="w-full h-11 px-3.5 rounded-xl border border-[#D2D2D7] bg-white text-[14px] text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="courseCode"
                        className="block text-[12px] font-medium text-[#1D1D1F] mb-1"
                      >
                        Course code
                      </label>
                      <input
                        id="courseCode"
                        type="text"
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                        placeholder="noc24-cs101"
                        className="w-full h-11 px-3.5 rounded-xl border border-[#D2D2D7] bg-white text-[14px] font-mono text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                      />
                    </div>
                  </div>

                  {/* Exam Center Selection (Mapped to canonical center) */}
                  <div>
                    <label
                      htmlFor="examCenter"
                      className="block text-[12px] font-medium text-[#1D1D1F] mb-1"
                    >
                      Canonical exam center venue
                    </label>
                    <select
                      id="examCenter"
                      value={examCenter}
                      onChange={(e) => setExamCenter(e.target.value)}
                      required
                      className="w-full h-11 px-3.5 rounded-xl border border-[#D2D2D7] bg-white text-[14px] text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                    >
                      {CANONICAL_EXAM_CENTERS.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[#6E6E73] mt-1">
                      Mapped automatically to the nearest canonical center in Coimbatore.
                    </p>
                  </div>

                  {/* Exam Date & Session */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="examDate"
                        className="block text-[12px] font-medium text-[#1D1D1F] mb-1"
                      >
                        Exam date
                      </label>
                      <input
                        id="examDate"
                        type="text"
                        value={examDate}
                        onChange={(e) => setExamDate(e.target.value)}
                        placeholder="2026-11-15"
                        required
                        className="w-full h-11 px-3.5 rounded-xl border border-[#D2D2D7] bg-white text-[14px] font-mono text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1">
                        Exam session
                      </label>
                      <div className="grid grid-cols-2 gap-2 h-11">
                        <button
                          type="button"
                          onClick={() => setSession("Forenoon")}
                          className={`rounded-xl text-[13px] font-medium border transition-all ${
                            session === "Forenoon"
                              ? "bg-[#0071E3] text-white border-[#0071E3]"
                              : "bg-white text-[#1D1D1F] border-[#D2D2D7] hover:bg-[#F5F5F7]"
                          }`}
                        >
                          Forenoon (FN)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSession("Afternoon")}
                          className={`rounded-xl text-[13px] font-medium border transition-all ${
                            session === "Afternoon"
                              ? "bg-[#0071E3] text-white border-[#0071E3]"
                              : "bg-white text-[#1D1D1F] border-[#D2D2D7] hover:bg-[#F5F5F7]"
                          }`}
                        >
                          Afternoon (AN)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Session Schedule Guidance */}
                  <div className="bg-[#F5F5F7] rounded-2xl p-4 border border-[#D2D2D7]/50 flex items-center justify-between text-[12px] text-[#6E6E73]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#0071E3]" />
                      <span>
                        Reporting: <strong className="text-[#1D1D1F]">{EXAM_SESSIONS[session].reportingTime}</strong>
                      </span>
                    </div>
                    <div>
                      Gate closes: <strong className="text-[#1D1D1F]">{EXAM_SESSIONS[session].gateCloses}</strong>
                    </div>
                    <div>
                      Exam: <strong className="text-[#1D1D1F]">{EXAM_SESSIONS[session].examTime}</strong>
                    </div>
                  </div>

                  {/* Confirm CTA */}
                  <button
                    type="submit"
                    disabled={isConfirming}
                    className="w-full min-h-[48px] px-6 py-3 rounded-full bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.98] text-white font-medium text-[15px] flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConfirming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving confirmed details...
                      </>
                    ) : (
                      <>
                        <span>Confirm details</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
