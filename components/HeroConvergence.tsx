"use client";

import React, { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Users, Check } from "lucide-react";

interface AvatarData {
  id: string;
  name: string;
  initials: string;
  origin: string;
  color: string;
  start: { x: number; y: number };
  target: { x: number; y: number };
}

const AVATARS: AvatarData[] = [
  {
    id: "daniel",
    name: "Daniel",
    initials: "DR",
    origin: "Karunya Nagar",
    color: "bg-blue-600",
    start: { x: -160, y: -70 },
    target: { x: -36, y: 35 },
  },
  {
    id: "priya",
    name: "Priya",
    initials: "PG",
    origin: "Gandhipuram",
    color: "bg-indigo-600",
    start: { x: 160, y: -70 },
    target: { x: -12, y: 35 },
  },
  {
    id: "samuel",
    name: "Samuel",
    initials: "SP",
    origin: "Kovaipudur",
    color: "bg-sky-600",
    start: { x: -140, y: 80 },
    target: { x: 12, y: 35 },
  },
  {
    id: "divya",
    name: "Divya",
    initials: "DR",
    origin: "Peelamedu",
    color: "bg-violet-600",
    start: { x: 140, y: 80 },
    target: { x: 36, y: 35 },
  },
];

export function HeroConvergence() {
  const shouldReduceMotion = useReducedMotion();
  const [converged, setConverged] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setConverged(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="relative w-full max-w-xl mx-auto h-[260px] sm:h-[300px] flex items-center justify-center my-6 select-none overflow-hidden"
      aria-label="Student travel group convergence diagram"
    >
      {/* Background radial route map guides */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[380px] h-[380px] rounded-full border border-[#D2D2D7]/35" />
        <div className="absolute w-[260px] h-[260px] rounded-full border border-[#D2D2D7]/25" />
        <div className="absolute w-[140px] h-[140px] rounded-full border border-[#D2D2D7]/20" />
      </div>

      {/* Center Exam Destination Pin */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Radar ping ring */}
        <div className="absolute -top-1 w-12 h-12 rounded-full bg-[#0071E3]/15 animate-ping pointer-events-none" />

        <div className="w-12 h-12 rounded-full bg-[#0071E3] text-white flex items-center justify-center shadow-md relative z-10">
          <MapPin className="w-6 h-6 text-white" />
        </div>

        <div className="mt-2.5 px-3 py-1 rounded-full bg-white border border-[#D2D2D7]/60 shadow-xs flex items-center gap-1.5 z-10">
          <span className="w-2 h-2 rounded-full bg-[#34C759]" />
          <span className="text-[12px] font-medium text-[#1D1D1F]">
            iON Digital Zone • Kovai Pudur
          </span>
        </div>
      </div>

      {/* Converging Student Avatars */}
      {AVATARS.map((avatar) => {
        const initial = shouldReduceMotion
          ? { x: avatar.target.x, y: avatar.target.y, opacity: 1 }
          : { x: avatar.start.x, y: avatar.start.y, opacity: 0.9 };

        const animate = {
          x: avatar.target.x,
          y: avatar.target.y,
          opacity: 1,
        };

        const transition = shouldReduceMotion
          ? { duration: 0 }
          : {
              duration: 1.6,
              delay: 0.3,
              ease: [0.16, 1, 0.3, 1] as const,
            };

        return (
          <motion.div
            key={avatar.id}
            initial={initial}
            animate={animate}
            transition={transition}
            className="absolute z-20 flex flex-col items-center group pointer-events-none"
          >
            <div
              className={`w-10 h-10 rounded-full ${avatar.color} text-white font-medium text-[13px] flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-black/5`}
              title={`${avatar.name} (${avatar.origin})`}
            >
              {avatar.initials}
            </div>

            {/* Starting location tag (fades out as they converge) */}
            <motion.span
              animate={{ opacity: converged ? 0 : 0.85 }}
              transition={{ duration: 0.4 }}
              className="text-[10px] text-[#6E6E73] font-medium mt-1 whitespace-nowrap bg-white/80 px-1.5 py-0.5 rounded"
            >
              {avatar.origin}
            </motion.span>
          </motion.div>
        );
      })}

      {/* Outcome Banner (Appears after convergence) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: converged ? 1 : 0, y: converged ? 0 : 15 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="absolute bottom-2 z-30 px-3.5 py-1.5 rounded-full bg-white/95 border border-[#D2D2D7]/70 shadow-sm flex items-center gap-2 backdrop-blur-xs"
      >
        <div className="w-4 h-4 rounded-full bg-[#34C759]/15 text-[#34C759] flex items-center justify-center">
          <Check className="w-2.5 h-2.5 stroke-[3]" />
        </div>
        <span className="text-[12px] font-medium text-[#1D1D1F]">
          Group formed • Meetup 06:45 AM • ₹400 / person
        </span>
      </motion.div>
    </div>
  );
}
