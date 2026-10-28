import {
  CANONICAL_EXAM_CENTERS,
  type CanonicalCenter,
} from "@/lib/constants/demo-data";

/**
 * Fuzzy matches an extracted exam center string to the closest canonical center.
 */
export function matchToCanonicalCenter(rawText: string): CanonicalCenter {
  if (!rawText) return CANONICAL_EXAM_CENTERS[0];

  const lower = rawText.toLowerCase().replace(/[^a-z0-9]/g, " ");

  // 1. Direct alias check
  for (const center of CANONICAL_EXAM_CENTERS) {
    if (lower.includes(center.name.toLowerCase())) {
      return center;
    }
    for (const alias of center.aliases) {
      if (lower.includes(alias.toLowerCase())) {
        return center;
      }
    }
  }

  // 2. Keyword score matching
  let bestCenter = CANONICAL_EXAM_CENTERS[0];
  let maxScore = 0;

  for (const center of CANONICAL_EXAM_CENTERS) {
    let score = 0;
    const centerWords = center.name.toLowerCase().split(/\s+/);
    for (const word of centerWords) {
      if (word.length > 3 && lower.includes(word)) {
        score += 2;
      }
    }
    for (const alias of center.aliases) {
      const aliasWords = alias.toLowerCase().split(/\s+/);
      for (const aw of aliasWords) {
        if (aw.length > 3 && lower.includes(aw)) {
          score += 1.5;
        }
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestCenter = center;
    }
  }

  return bestCenter;
}
