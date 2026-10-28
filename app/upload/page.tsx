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
  Sparkles,
  Code2,
  AlertTriangle,
} from "lucide-react";
import {
  CANONICAL_EXAM_CENTERS,
  type CanonicalCenter,
} from "@/lib/constants/demo-data";
import type { SessionUser } from "@/lib/auth/session";
import type { ExtractedFields, IntakeResult } from "@/lib/agents/intake-agent";
import { BarcodeValidationBadge, type BarcodeStatus } from "@/components/BarcodeValidationBadge";
import { decodeBarcodeFromImage, isBarcodeValidationEnabled } from "@/lib/barcode/zxing";
import { SignInSheet } from "@/components/SignInSheet";

export default function TicketUploadPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedSampleFile, setSelectedSampleFile] = useState<string | null>(null);

  // Barcode validation state
  const [barcodeStatus, setBarcodeStatus] = useState<BarcodeStatus>("idle");
  const [decodedBarcode, setDecodedBarcode] = useState<string | null>(null);

  // Processing state (simple inline state)
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debug view state
  const [showDebugView, setShowDebugView] = useState(false);
  const [rawTranscript, setRawTranscript] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState<Record<string, any> | null>(null);

  // Confirmation Card editable fields
  const [studentName, setStudentName] = useState("");
  const [registerNo, setRegisterNo] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [examCenter, setExamCenter] = useState(CANONICAL_EXAM_CENTERS[0].name);
  const [examDate, setExamDate] = useState("");
  const [session, setSession] = useState<"forenoon" | "afternoon">("forenoon");

  // Track which fields came back empty from extraction
  const [emptyFields, setEmptyFields] = useState<Record<string, boolean>>({});
  const [hasScanned, setHasScanned] = useState(false);

  // Confirm state
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
          setStudentName(data.user.name || "");
          setRegisterNo(data.user.registerNo || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoadingUser(false));
  }, []);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setSelectedSampleFile(null);
      setErrorMessage(null);
      const url = URL.createObjectURL(selected);
      setPreviewUrl(url);
    }
  };

  // Quick preset sample selection (for testing)
  const handleSelectSample = (sampleFilename: string) => {
    setSelectedSampleFile(sampleFilename);
    setFile(null);
    setErrorMessage(null);
    setPreviewUrl(`/sample-tickets/${sampleFilename}`);
  };

  // Process ticket through Intake Agent
  const handleProcessTicket = async () => {
    if (!file && !selectedSampleFile) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setConfirmError(null);

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

      const data: IntakeResult = await res.json();

      setRawTranscript(data.rawTranscript || null);
      setRawJson(data.rawJson || null);

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to extract hall ticket details.");
        // Leave fields open for manual entry
        setHasScanned(true);
        setEmptyFields({
          courseName: !courseName,
          examDate: !examDate,
          examCenter: !examCenter,
        });
        return;
      }

      if (data.isMismatch) {
        setErrorMessage(
          data.mismatchReason ||
            "The register number on this ticket does not match your signed-in Karunya account."
        );
      }

      const ext = data.extracted;
      if (ext) {
        setHasScanned(true);
        if (ext.name) setStudentName(ext.name);
        if (ext.registerNumber) setRegisterNo(ext.registerNumber);
        if (ext.courseName) setCourseName(ext.courseName);
        if (ext.courseCode) setCourseCode(ext.courseCode);
        if (ext.canonicalCenter?.name) {
          setExamCenter(ext.canonicalCenter.name);
        } else if (ext.examCenter) {
          setExamCenter(ext.examCenter);
        }
        if (ext.examDate) setExamDate(ext.examDate);
        if (ext.session) setSession(ext.session);

        // Highlight fields that came back empty or unread
        setEmptyFields({
          name: !ext.name,
          registerNumber: !ext.registerNumber,
          courseName: !ext.courseName,
          courseCode: !ext.courseCode,
          examCenter: !ext.examCenter,
          examDate: !ext.examDate,
          session: !ext.session,
        });
      }
    } catch {
      setErrorMessage("Network error while connecting to Intake Agent.");
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
          courseName: courseName.trim(),
          examCenter: examCenter.trim(),
          examDate: examDate.trim(),
          session: session === "afternoon" ? "Afternoon" : "Forenoon",
          extractedJson: rawJson || {
            name: studentName,
            registerNumber: registerNo,
            courseCode,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setConfirmError(data.error || "Could not save confirmed ticket.");
        setIsConfirming(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setConfirmError("Network error while confirming ticket.");
    } finally {
      setIsConfirming(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFD]">
        <Loader2 className="w-8 h-8 text-[#0071E3] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FBFBFD] text-[#1D1D1F]">
        <Navbar
          user={null}
          onOpenSignIn={() => setIsSignInOpen(true)}
          onSignOut={() => router.push("/")}
        />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#D2D2D7]/60 shadow-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center mx-auto mb-4">
              <FileUp className="w-6 h-6" />
            </div>
            <h2 className="text-[20px] font-semibold text-[#1D1D1F] mb-2">
              Sign in to upload your ticket
            </h2>
            <p className="text-[14px] text-[#6E6E73] mb-6">
              Enter your Karunya student credentials to verify and associate your exam details.
            </p>
            <button
              onClick={() => setIsSignInOpen(true)}
              className="w-full min-h-[44px] px-6 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white font-medium text-[15px] shadow-sm transition-all"
            >
              Sign in
            </button>
          </div>
        </main>
        <SignInSheet
          isOpen={isSignInOpen}
          onClose={() => setIsSignInOpen(false)}
          onSuccess={(signedIn) => {
            setUser(signedIn);
            setStudentName(signedIn.name || "");
            setRegisterNo(signedIn.registerNo || "");
            setIsSignInOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD] text-[#1D1D1F]">
      <Navbar
        user={user}
        onOpenSignIn={() => setIsSignInOpen(true)}
        onSignOut={async () => {
          await fetch("/api/auth/signout", { method: "POST" });
          setUser(null);
          router.push("/");
        }}
      />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>

          {/* Temporary Debug View Toggle (Admin/Testing) */}
          {(rawTranscript || rawJson) && (
            <button
              type="button"
              onClick={() => setShowDebugView(!showDebugView)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] text-[12px] font-medium border border-[#D2D2D7]/60 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5 text-[#0071E3]" />
              {showDebugView ? "Hide Debug View" : "Debug View (Transcript & JSON)"}
            </button>
          )}
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-[12px] font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Hall Ticket Intake
          </div>
          <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[#1D1D1F]">
            Upload your NPTEL hall ticket
          </h1>
          <p className="text-[16px] text-[#6E6E73] mt-1">
            Signed in as <span className="font-semibold text-[#1D1D1F]">{user.name}</span> (
            <span className="font-mono text-[#1D1D1F]">{user.registerNo}</span>).
          </p>
        </div>

        {/* Test Tickets Bar (Allows testing sample tickets quickly) */}
        <div className="bg-[#F5F5F7] rounded-2xl p-4 border border-[#D2D2D7]/60 mb-8">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <span className="text-[13px] font-medium text-[#1D1D1F]">
              Testing sample tickets:
            </span>
            <span className="text-[11px] text-[#6E6E73]">
              Choose a sample ticket to test extraction
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "ticket-1-urk22cs1001.svg", label: "Sample Ticket 1 (Daniel Raj)" },
              { id: "ticket-2-urk22cs1002.svg", label: "Sample Ticket 2 (Priya George)" },
              { id: "ticket-3-urk22ai1003.svg", label: "Sample Ticket 3 (Samuel Paul)" },
              { id: "ticket-4-urk22ec1004.svg", label: "Sample Ticket 4 (Nithya Menon)" },
            ].map((ticket) => {
              const isSelected = selectedSampleFile === ticket.id;
              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => handleSelectSample(ticket.id)}
                  className={`text-left p-2.5 rounded-xl text-[12px] border transition-all ${
                    isSelected
                      ? "bg-[#0071E3] text-white border-[#0071E3] shadow-xs"
                      : "bg-white hover:bg-white/80 border-[#D2D2D7]/60 text-[#1D1D1F]"
                  }`}
                >
                  <div className="font-semibold truncate">{ticket.label}</div>
                  <div
                    className={`text-[11px] font-mono mt-0.5 truncate ${
                      isSelected ? "text-white/80" : "text-[#6E6E73]"
                    }`}
                  >
                    {ticket.id}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Temporary Debug View (Admin only / on demand) */}
        {showDebugView && (rawTranscript || rawJson) && (
          <div className="bg-[#1D1D1F] text-[#F5F5F7] rounded-3xl p-6 mb-8 border border-black/20 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-[14px] font-mono font-semibold text-[#0071E3]">
                Extraction Agent Debug View
              </span>
              <span className="text-[11px] text-white/50">Gemini Two-Pass Output</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px] font-mono">
              <div>
                <div className="text-white/70 font-semibold mb-1">Pass 1: Verbatim Transcript</div>
                <div className="bg-black/40 p-3 rounded-xl max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-white/5">
                  {rawTranscript || "No transcript available"}
                </div>
              </div>

              <div>
                <div className="text-white/70 font-semibold mb-1">Pass 2: Parsed JSON</div>
                <pre className="bg-black/40 p-3 rounded-xl max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-white/5">
                  {JSON.stringify(rawJson, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid: Upload Dropzone vs Confirmation Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Dropzone & Scan Action */}
          <div className="md:col-span-5 space-y-5">
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
                    Supports PNG, JPG, SVG, or PDF directly from NPTEL portal.
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
                  Reading your ticket...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Extract ticket details
                </>
              )}
            </button>

            {/* Simple Inline Reading Progress State */}
            {isProcessing && (
              <div className="bg-white rounded-2xl p-4 border border-[#0071E3]/30 shadow-xs flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-[#0071E3] animate-spin shrink-0" />
                <div className="text-[13px] text-[#1D1D1F]">
                  <span className="font-semibold">Reading your ticket...</span>
                  <div className="text-[12px] text-[#6E6E73]">
                    Transcribing lines and parsing exam details
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Confirmation Card */}
          <div className="md:col-span-7">
            {/* Error Banner */}
            {errorMessage && (
              <div
                className="mb-6 rounded-3xl bg-amber-50 border border-amber-200/90 p-5 text-amber-950 shadow-xs space-y-2"
                role="alert"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-[15px] font-semibold text-amber-950">
                      Extraction notice
                    </h3>
                    <p className="text-[13px] text-amber-800 mt-0.5 leading-relaxed">
                      {errorMessage}
                    </p>
                    <p className="text-[12px] text-amber-700 mt-1">
                      You can review and enter your details manually in the confirmation form below.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Editable Confirmation Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D2D2D7]/70 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-[#D2D2D7]/50 mb-6">
                <div>
                  <h2 className="text-[20px] font-semibold text-[#1D1D1F]">
                    Confirm hall ticket details
                  </h2>
                  <p className="text-[13px] text-[#6E6E73] mt-0.5">
                    All fields remain editable. Empty fields are highlighted for review.
                  </p>
                </div>
                {hasScanned && !errorMessage && (
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
                {/* Student Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="studentName" className="text-[12px] font-medium text-[#1D1D1F]">
                        Candidate name
                      </label>
                      {emptyFields.name && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Needs entry
                        </span>
                      )}
                    </div>
                    <input
                      id="studentName"
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Candidate full name"
                      className={`w-full h-11 px-3.5 rounded-xl border text-[14px] text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all ${
                        emptyFields.name && !studentName
                          ? "border-amber-400 bg-amber-50/30"
                          : "border-[#D2D2D7] bg-white"
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="registerNo" className="text-[12px] font-medium text-[#1D1D1F]">
                        Register number
                      </label>
                      {emptyFields.registerNumber && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Needs entry
                        </span>
                      )}
                    </div>
                    <input
                      id="registerNo"
                      type="text"
                      value={registerNo}
                      onChange={(e) => setRegisterNo(e.target.value.toUpperCase())}
                      placeholder="URK22CS1001"
                      className={`w-full h-11 px-3.5 rounded-xl border text-[14px] font-mono text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all ${
                        emptyFields.registerNumber && !registerNo
                          ? "border-amber-400 bg-amber-50/30"
                          : "border-[#D2D2D7] bg-white"
                      }`}
                    />
                  </div>
                </div>

                {/* Course Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="courseName" className="text-[12px] font-medium text-[#1D1D1F]">
                        Course title *
                      </label>
                      {emptyFields.courseName && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Needs entry
                        </span>
                      )}
                    </div>
                    <input
                      id="courseName"
                      type="text"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      placeholder="e.g. Cloud Computing and Distributed Systems"
                      required
                      className={`w-full h-11 px-3.5 rounded-xl border text-[14px] text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all ${
                        emptyFields.courseName && !courseName
                          ? "border-amber-400 bg-amber-50/30"
                          : "border-[#D2D2D7] bg-white"
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="courseCode" className="text-[12px] font-medium text-[#1D1D1F]">
                        Course code
                      </label>
                      {emptyFields.courseCode && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Needs entry
                        </span>
                      )}
                    </div>
                    <input
                      id="courseCode"
                      type="text"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      placeholder="noc24-cs101"
                      className={`w-full h-11 px-3.5 rounded-xl border text-[14px] font-mono text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all ${
                        emptyFields.courseCode && !courseCode
                          ? "border-amber-400 bg-amber-50/30"
                          : "border-[#D2D2D7] bg-white"
                      }`}
                    />
                  </div>
                </div>

                {/* Exam Center Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="examCenter" className="text-[12px] font-medium text-[#1D1D1F]">
                      Exam center venue *
                    </label>
                    {emptyFields.examCenter && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" /> Needs entry
                      </span>
                    )}
                  </div>
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
                </div>

                {/* Exam Date & Session */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="examDate" className="text-[12px] font-medium text-[#1D1D1F]">
                        Exam date (YYYY-MM-DD) *
                      </label>
                      {emptyFields.examDate && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Needs entry
                        </span>
                      )}
                    </div>
                    <input
                      id="examDate"
                      type="text"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      placeholder="2026-11-15"
                      required
                      className={`w-full h-11 px-3.5 rounded-xl border text-[14px] font-mono text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all ${
                        emptyFields.examDate && !examDate
                          ? "border-amber-400 bg-amber-50/30"
                          : "border-[#D2D2D7] bg-white"
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[12px] font-medium text-[#1D1D1F]">
                        Exam session *
                      </label>
                      {emptyFields.session && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Needs entry
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 h-11">
                      <button
                        type="button"
                        onClick={() => setSession("forenoon")}
                        className={`rounded-xl text-[13px] font-medium border transition-all ${
                          session === "forenoon"
                            ? "bg-[#0071E3] text-white border-[#0071E3]"
                            : "bg-white text-[#1D1D1F] border-[#D2D2D7] hover:bg-[#F5F5F7]"
                        }`}
                      >
                        Forenoon (FN)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSession("afternoon")}
                        className={`rounded-xl text-[13px] font-medium border transition-all ${
                          session === "afternoon"
                            ? "bg-[#0071E3] text-white border-[#0071E3]"
                            : "bg-white text-[#1D1D1F] border-[#D2D2D7] hover:bg-[#F5F5F7]"
                        }`}
                      >
                        Afternoon (AN)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Confirm CTA */}
                <button
                  type="submit"
                  disabled={isConfirming}
                  className="w-full min-h-[48px] px-6 py-3 rounded-full bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.98] text-white font-medium text-[15px] flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
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
          </div>
        </div>
      </main>

      <SignInSheet
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSuccess={(signedIn) => {
          setUser(signedIn);
          setStudentName(signedIn.name || "");
          setRegisterNo(signedIn.registerNo || "");
          setIsSignInOpen(false);
        }}
      />
    </div>
  );
}
