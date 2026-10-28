import { BrowserMultiFormatReader } from "@zxing/browser";

let readerInstance: BrowserMultiFormatReader | null = null;

function getReader(): BrowserMultiFormatReader {
  if (!readerInstance) {
    readerInstance = new BrowserMultiFormatReader();
  }
  return readerInstance;
}

/**
 * Decodes barcode or QR code from an image source URL or object URL in the browser.
 * Returns decoded string or null if unreadable / not found.
 */
export async function decodeBarcodeFromImage(
  imageSrc: string
): Promise<{ text: string | null; format?: string }> {
  if (typeof window === "undefined") {
    return { text: null };
  }

  try {
    const reader = getReader();
    const img = new Image();
    img.crossOrigin = "anonymous";

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageSrc;
    });

    const result = await reader.decodeFromImageElement(img);
    if (result) {
      return {
        text: result.getText().trim(),
        format: result.getBarcodeFormat().toString(),
      };
    }
  } catch (err: unknown) {
    // Barcode not found or unreadable is a normal expected outcome
  }

  return { text: null };
}

/**
 * Feature flag for barcode validation
 * Enabled by default or via NEXT_PUBLIC_ENABLE_BARCODE_VALIDATION
 */
export function isBarcodeValidationEnabled(): boolean {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_ENABLE_BARCODE_VALIDATION !== "false";
  }
  return true;
}
