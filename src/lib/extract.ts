// Client-side text extraction from common resume file types.
import mammoth from "mammoth";
import Tesseract from "tesseract.js";

async function extractPdf(file: File): Promise<string> {
  // Lazy-load pdfjs only on client
  const pdfjs: any = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url" as string)).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it: any) => it.str).join(" ") + "\n";
  }
  
  const trimmed = out.trim();
  // Fallback to OCR if there's very little selectable text (e.g., scanned image)
  if (trimmed.length < 50) {
    let ocrOut = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
        ocrOut += text + "\n";
      }
    }
    return ocrOut.trim();
  }
  
  return trimmed;
}

async function extractDocx(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return res.value.trim();
}

async function extractTxt(file: File): Promise<string> {
  return (await file.text()).trim();
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return extractPdf(file);
  if (name.endsWith(".docx")) return extractDocx(file);
  if (name.endsWith(".txt") || file.type.startsWith("text/")) return extractTxt(file);
  // Fallback: attempt as text
  return extractTxt(file);
}
