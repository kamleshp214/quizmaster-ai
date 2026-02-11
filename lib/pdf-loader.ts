import fs from "fs";
import PDFParser from "pdf2json";

export async function getPdfText(fileBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    // ⚡ FIX: Changed '1' to 'true' to satisfy TypeScript
    const pdfParser = new PDFParser(null, true);

    // Handle errors
    pdfParser.on("pdfParser_dataError", (errData: any) => {
      console.error("PDF Parser Error:", errData.parserError);
      reject(new Error("Failed to parse PDF text."));
    });

    // Handle success
    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        const rawText = pdfData.Pages.map((page: any) => {
          return page.Texts.map((textItem: any) => {
            return decodeURIComponent(textItem.R[0].T);
          }).join(" ");
        }).join("\n\n");

        const cleanText = rawText.replace(/\s+/g, " ").trim();
        resolve(cleanText);
      } catch (err) {
        reject(new Error("Failed to extract text from PDF structure."));
      }
    });

    pdfParser.parseBuffer(fileBuffer);
  });
}
