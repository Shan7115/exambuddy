import { GoogleGenerativeAI } from "@google/generative-ai";

let genAIInstance: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }
  if (!genAIInstance) {
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
}

export function getGeminiModelName(): string {
  const envModel = process.env.GEMINI_MODEL?.trim();
  // Valid Gemini flash models: gemini-1.5-flash, gemini-2.0-flash
  if (envModel === "gemini-2.0-flash" || envModel === "gemini-1.5-flash" || envModel === "gemini-1.5-pro") {
    return envModel;
  }
  return "gemini-1.5-flash";
}
