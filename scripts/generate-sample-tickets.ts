import fs from "fs";
import path from "path";
import { SAMPLE_PRESENTERS } from "../lib/constants/demo-data";

// Simple Code 128 B barcode bar generator
function generateCode128SvgBars(text: string, width = 280, height = 45): string {
  // Generate deterministic barcode bar patterns from string
  const hash = Array.from(text).map((c) => c.charCodeAt(0));
  let x = 10;
  let bars = "";
  
  // Start pattern
  bars += `<rect x="${x}" y="0" width="3" height="${height}" fill="#1D1D1F" />`;
  x += 5;
  bars += `<rect x="${x}" y="0" width="2" height="${height}" fill="#1D1D1F" />`;
  x += 4;

  for (let i = 0; i < hash.length; i++) {
    const val = hash[i];
    const b1 = (val % 3) + 1;
    const b2 = ((val >> 2) % 3) + 1;
    const b3 = ((val >> 4) % 3) + 1;
    
    bars += `<rect x="${x}" y="0" width="${b1}" height="${height}" fill="#1D1D1F" />`;
    x += b1 + 2;
    bars += `<rect x="${x}" y="0" width="${b2}" height="${height}" fill="#1D1D1F" />`;
    x += b2 + 3;
    bars += `<rect x="${x}" y="0" width="${b3}" height="${height}" fill="#1D1D1F" />`;
    x += b3 + 2;
  }

  // Stop pattern
  bars += `<rect x="${x}" y="0" width="4" height="${height}" fill="#1D1D1F" />`;
  x += 6;
  bars += `<rect x="${x}" y="0" width="2" height="${height}" fill="#1D1D1F" />`;

  return `<svg viewBox="0 0 ${x + 10} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}

function createHallTicketSvg(presenter: (typeof SAMPLE_PRESENTERS)[0]): string {
  const barcodeSvg = generateCode128SvgBars(presenter.registerNo, 240, 42);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="920" viewBox="0 0 800 920" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif">
  <!-- Ticket Card Background -->
  <rect width="800" height="920" fill="#FFFFFF" />
  <rect x="20" y="20" width="760" height="880" rx="12" fill="#FFFFFF" stroke="#D2D2D7" stroke-width="2" />
  
  <!-- Header Bar -->
  <rect x="20" y="20" width="760" height="74" rx="12" fill="#F5F5F7" />
  <rect x="20" y="80" width="760" height="14" fill="#F5F5F7" />
  <line x1="20" y1="94" x2="780" y2="94" stroke="#D2D2D7" stroke-width="1.5" />
  
  <text x="40" y="52" font-size="18" font-weight="700" fill="#1D1D1F" letter-spacing="0.5">NPTEL ONLINE CERTIFICATION EXAM</text>
  <text x="40" y="74" font-size="12" font-weight="600" fill="#6E6E73">HALL TICKET / ADMIT CARD — OCTOBER / NOVEMBER 2026</text>
  <text x="760" y="62" font-size="11" font-weight="600" fill="#0071E3" text-anchor="end">KARUNYA UNIVERSITY APPLICANT</text>

  <!-- Barcode & Roll No Section -->
  <g transform="translate(480, 115)">
    <rect x="-10" y="-8" width="270" height="85" rx="8" fill="#FBFBFD" stroke="#E5E5EA" stroke-width="1" />
    ${barcodeSvg}
    <text x="120" y="64" font-size="13" font-family="Courier, monospace" font-weight="700" fill="#1D1D1F" text-anchor="middle" letter-spacing="2">${presenter.registerNo}</text>
  </g>

  <!-- Student Photo Placeholder -->
  <g transform="translate(50, 115)">
    <rect width="105" height="125" rx="8" fill="#F5F5F7" stroke="#D2D2D7" stroke-width="1.5" />
    <!-- Avatar Icon Placeholder -->
    <circle cx="52.5" cy="48" r="24" fill="#D2D2D7" />
    <path d="M 22 105 Q 22 78 52.5 78 Q 83 78 83 105 Z" fill="#D2D2D7" />
    <text x="52.5" y="118" font-size="9" font-weight="600" fill="#6E6E73" text-anchor="middle">PASSPORT PHOTO</text>
  </g>

  <!-- Candidate Details Table -->
  <g transform="translate(180, 120)">
    <text x="0" y="18" font-size="12" font-weight="600" fill="#6E6E73">Candidate Name:</text>
    <text x="140" y="18" font-size="16" font-weight="700" fill="#1D1D1F">${presenter.name}</text>

    <text x="0" y="44" font-size="12" font-weight="600" fill="#6E6E73">Roll / Register No:</text>
    <text x="140" y="44" font-size="14" font-family="Courier, monospace" font-weight="700" fill="#0071E3">${presenter.registerNo}</text>

    <text x="0" y="70" font-size="12" font-weight="600" fill="#6E6E73">Institution:</text>
    <text x="140" y="70" font-size="12" font-weight="600" fill="#1D1D1F">Karunya Institute of Technology and Sciences</text>

    <text x="0" y="96" font-size="12" font-weight="600" fill="#6E6E73">Registered Email:</text>
    <text x="140" y="96" font-size="12" font-weight="500" fill="#1D1D1F">${presenter.email}</text>

    <text x="0" y="122" font-size="12" font-weight="600" fill="#6E6E73">Pickup Landmark:</text>
    <text x="140" y="122" font-size="12" font-weight="500" fill="#1D1D1F">${presenter.pickupArea}</text>
  </g>

  <!-- Divider -->
  <line x1="50" y1="260" x2="750" y2="260" stroke="#E5E5EA" stroke-width="1.5" />

  <!-- Exam Schedule & Course Card -->
  <g transform="translate(50, 280)">
    <rect width="700" height="150" rx="10" fill="#FBFBFD" stroke="#D2D2D7" stroke-width="1.2" />
    <rect width="700" height="34" rx="10" fill="#F5F5F7" />
    <rect y="24" width="700" height="10" fill="#F5F5F7" />
    <line x1="0" y1="34" x2="700" y2="34" stroke="#D2D2D7" stroke-width="1" />
    
    <text x="20" y="23" font-size="12" font-weight="700" fill="#1D1D1F">EXAM SCHEDULE AND COURSE DETAILS</text>

    <text x="20" y="62" font-size="12" font-weight="600" fill="#6E6E73">Course Title:</text>
    <text x="140" y="62" font-size="14" font-weight="700" fill="#1D1D1F">${presenter.courseName}</text>

    <text x="20" y="90" font-size="12" font-weight="600" fill="#6E6E73">Course Code:</text>
    <text x="140" y="90" font-size="13" font-family="Courier, monospace" font-weight="600" fill="#1D1D1F">${presenter.courseCode}</text>

    <text x="20" y="118" font-size="12" font-weight="600" fill="#6E6E73">Exam Date:</text>
    <text x="140" y="118" font-size="13" font-weight="700" fill="#1D1D1F">Sunday, ${presenter.examDate}</text>

    <text x="380" y="90" font-size="12" font-weight="600" fill="#6E6E73">Session:</text>
    <text x="460" y="90" font-size="13" font-weight="700" fill="${presenter.session === "Forenoon" ? "#0071E3" : "#FF9500"}">${presenter.session} (${presenter.examTime})</text>

    <text x="380" y="118" font-size="12" font-weight="600" fill="#6E6E73">Reporting Time:</text>
    <text x="480" y="118" font-size="13" font-weight="700" fill="#1D1D1F">${presenter.reportingTime}</text>
  </g>

  <!-- Exam Center Venue Card -->
  <g transform="translate(50, 450)">
    <rect width="700" height="150" rx="10" fill="#FFFFFF" stroke="#0071E3" stroke-width="1.5" />
    <rect width="700" height="34" rx="10" fill="#0071E3" fill-opacity="0.08" />
    <rect y="24" width="700" height="10" fill="#0071E3" fill-opacity="0.08" />
    <line x1="0" y1="34" x2="700" y2="34" stroke="#0071E3" stroke-opacity="0.2" stroke-width="1" />

    <text x="20" y="23" font-size="12" font-weight="700" fill="#0071E3">ASSIGNED EXAM CENTER VENUE</text>

    <text x="20" y="64" font-size="12" font-weight="600" fill="#6E6E73">Center Name:</text>
    <text x="140" y="64" font-size="15" font-weight="700" fill="#1D1D1F">${presenter.examCenter}</text>

    <text x="20" y="96" font-size="12" font-weight="600" fill="#6E6E73">Center City:</text>
    <text x="140" y="96" font-size="13" font-weight="600" fill="#1D1D1F">Coimbatore, Tamil Nadu</text>

    <text x="20" y="124" font-size="12" font-weight="600" fill="#6E6E73">Instructions:</text>
    <text x="140" y="124" font-size="12" font-weight="500" fill="#6E6E73">Original college ID card and this printed hall ticket are mandatory at the gate.</text>
  </g>

  <!-- Signatures and Verification Boxes -->
  <g transform="translate(50, 620)">
    <!-- Candidate Signature Box -->
    <rect x="0" y="0" width="335" height="100" rx="8" fill="#FBFBFD" stroke="#D2D2D7" stroke-dasharray="4 3" />
    <text x="167" y="85" font-size="11" font-weight="600" fill="#6E6E73" text-anchor="middle">Candidate Signature (To be signed in presence of Invigilator)</text>
    <!-- Handwritten style fake signature -->
    <path d="M 90 50 Q 120 30 150 55 Q 180 70 210 45 Q 230 35 250 50" fill="none" stroke="#1D1D1F" stroke-width="2" stroke-linecap="round" />

    <!-- Invigilator Verification Box -->
    <rect x="365" y="0" width="335" height="100" rx="8" fill="#FBFBFD" stroke="#D2D2D7" stroke-dasharray="4 3" />
    <text x="532" y="85" font-size="11" font-weight="600" fill="#6E6E73" text-anchor="middle">Invigilator Verification Seal and Signature</text>
    <circle cx="532.5" cy="45" r="25" fill="none" stroke="#34C759" stroke-width="1.5" stroke-dasharray="3 2" />
    <text x="532.5" y="49" font-size="9" font-weight="700" fill="#34C759" text-anchor="middle">VERIFIED</text>
  </g>

  <!-- Footer Instructions -->
  <g transform="translate(50, 745)">
    <rect width="700" height="120" rx="8" fill="#F5F5F7" />
    <text x="20" y="24" font-size="11" font-weight="700" fill="#1D1D1F">CRITICAL EXAM DAY INSTRUCTIONS FOR KARUNYA STUDENTS:</text>
    <text x="20" y="46" font-size="10.5" font-weight="500" fill="#6E6E73">1. Arrive at least 60 minutes prior to the scheduled exam commencement.</text>
    <text x="20" y="66" font-size="10.5" font-weight="500" fill="#6E6E73">2. Electronic devices, smartwatches, and programmable calculators are strictly prohibited.</text>
    <text x="20" y="86" font-size="10.5" font-weight="500" fill="#6E6E73">3. ExamBuddy coordination is for student transport grouping. Always follow official NPTEL regulations.</text>
    <text x="20" y="106" font-size="10" font-weight="600" fill="#0071E3">ExamBuddy AI System • Hall Ticket Document Ref: NPTEL-2026-${presenter.registerNo}</text>
  </g>
</svg>`;
}

async function main() {
  const dirSample = path.join(process.cwd(), "sample-tickets");
  const dirPublic = path.join(process.cwd(), "public", "sample-tickets");

  if (!fs.existsSync(dirSample)) fs.mkdirSync(dirSample, { recursive: true });
  if (!fs.existsSync(dirPublic)) fs.mkdirSync(dirPublic, { recursive: true });

  console.log("Generating 4 sample hall tickets...");

  SAMPLE_PRESENTERS.forEach((presenter, idx) => {
    const filename = `ticket-${idx + 1}-${presenter.registerNo.toLowerCase()}.svg`;
    const svgContent = createHallTicketSvg(presenter);

    fs.writeFileSync(path.join(dirSample, filename), svgContent, "utf-8");
    fs.writeFileSync(path.join(dirPublic, filename), svgContent, "utf-8");
    console.log(`✓ Created ${filename} (${presenter.name} - ${presenter.examCenter})`);
  });

  console.log("Done generating sample tickets!");
}

main().catch(console.error);
