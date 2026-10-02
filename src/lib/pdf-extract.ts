import { extractText, getDocumentProxy } from "unpdf";
import { cleanExtractedText } from "./pdf-parser";

export async function extractPdfText(bytes: Uint8Array) {
  try {
    const pdf = await getDocumentProxy(bytes);
    const result = await extractText(pdf, { mergePages: true });
    const text = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
    return {
      text: cleanExtractedText(text || ""),
      totalPages: result.totalPages || 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown PDF error";
    throw new Error(
      `Could not read this PDF (${message}). The file may be corrupt, scanned-only, or encrypted.`,
    );
  }
}
