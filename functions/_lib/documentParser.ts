import { extractText, getDocumentProxy } from "unpdf";
import { unzipSync, strFromU8 } from "fflate";

export class UnsupportedFileError extends Error {}

function guessKind(filename: string, mimeType: string): "pdf" | "pptx" | "text" | "unknown" {
  const lower = filename.toLowerCase();
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    lower.endsWith(".pptx")
  )
    return "pptx";
  if (lower.endsWith(".ppt") || lower.endsWith(".doc")) return "unknown";
  if (mimeType.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md")) return "text";
  return "unknown";
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

// PPTX 是 zip 檔，投影片文字放在 ppt/slides/slideN.xml 裡的 <a:t> 標籤中
function extractPptxText(buffer: ArrayBuffer): string {
  const files = unzipSync(new Uint8Array(buffer));
  const slideEntries = Object.keys(files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml/)?.[1] || 0);
      const nb = Number(b.match(/slide(\d+)\.xml/)?.[1] || 0);
      return na - nb;
    });

  const slideTexts = slideEntries.map((name) => {
    const xml = strFromU8(files[name]);
    // 每個 <a:p> 是一個段落／條列項目，段落內的 <a:t> 是同一句話的片段（直接接起來），
    // 段落之間才換行，這樣才不會把整張投影片的條列文字擠成一行看不出結構。
    const paragraphs = [...xml.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g)].map((pMatch) => {
      const runs = [...pMatch[1].matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
      return runs.join("").trim();
    });
    return paragraphs.filter(Boolean).join("\n");
  });

  return slideTexts.filter(Boolean).map((t, i) => `【投影片 ${i + 1}】\n${t}`).join("\n");
}

export async function extractTextFromFile(filename: string, mimeType: string, buffer: ArrayBuffer): Promise<string> {
  const kind = guessKind(filename, mimeType);
  if (kind === "pdf") {
    const text = await extractPdfText(buffer);
    if (!text || text.trim().length < 10) throw new UnsupportedFileError("這份 PDF 似乎沒有可擷取的文字內容（可能是掃描圖片）");
    return text;
  }
  if (kind === "pptx") {
    const text = extractPptxText(buffer);
    if (!text || text.trim().length < 10) throw new UnsupportedFileError("這份簡報似乎沒有可擷取的文字內容");
    return text;
  }
  if (kind === "text") {
    return new TextDecoder("utf-8").decode(buffer);
  }
  throw new UnsupportedFileError("目前只支援 PDF（.pdf）和 PowerPoint（.pptx）檔案，請確認檔案格式");
}
