"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, Loader2, QrCode } from "lucide-react";

export type BarcodeStatus = "idle" | "scanning" | "matched" | "unverified";

interface BarcodeValidationBadgeProps {
  status: BarcodeStatus;
  decodedValue?: string | null;
  expectedRegisterNo?: string;
}

export function BarcodeValidationBadge({
  status,
  decodedValue,
  expectedRegisterNo,
}: BarcodeValidationBadgeProps) {
  if (status === "idle") return null;

  if (status === "scanning") {
    return (
      <div className="rounded-2xl bg-[#F5F5F7] border border-[#D2D2D7]/60 p-3.5 flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-[#0071E3] animate-spin shrink-0" />
        <div className="text-[12px] text-[#6E6E73]">
          Decoding Code128 barcode with ZXing browser engine...
        </div>
      </div>
    );
  }

  if (status === "matched") {
    return (
      <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200/80 p-3.5 text-emerald-950 flex items-start gap-3 shadow-2xs">
        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-emerald-900">
              Ticket validated
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-200/60 text-emerald-900">
              {decodedValue || expectedRegisterNo}
            </span>
          </div>
          <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
            Barcode matches your Karunya register number. Format check only; does not claim official NPTEL document authenticity.
          </p>
        </div>
      </div>
    );
  }

  // status === 'unverified'
  return (
    <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-3.5 text-amber-950 flex items-start gap-3 shadow-2xs">
      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
        <AlertTriangle className="w-4 h-4 text-amber-700" />
      </div>
      <div>
        <div className="text-[13px] font-semibold text-amber-900">
          Could not verify, please confirm details
        </div>
        <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
          Barcode was unreadable or not detected in this image. Please review and confirm your extracted details manually below.
        </p>
      </div>
    </div>
  );
}
