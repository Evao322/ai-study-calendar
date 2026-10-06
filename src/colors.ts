// 低飽和度色票：依學科名稱產生穩定的顏色（同一學科永遠同一色）
const PALETTE = [
  { bg: "#E3F2FD", text: "#1565C0", accent: "#64B5F6" },
  { bg: "#E8F5E9", text: "#2E7D32", accent: "#81C784" },
  { bg: "#FFF3E0", text: "#B35900", accent: "#FFB74D" },
  { bg: "#F3E5F5", text: "#6A1B9A", accent: "#BA68C8" },
  { bg: "#FCE4EC", text: "#AD1457", accent: "#F06292" },
  { bg: "#E0F2F1", text: "#00695C", accent: "#4DB6AC" },
  { bg: "#FFFDE0", text: "#8D8000", accent: "#D4C634" },
  { bg: "#ECEFF1", text: "#455A64", accent: "#90A4AE" },
];

const TEST_COLOR = { bg: "#ECEFF1", text: "#455A64", accent: "#90A4AE" };

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function subjectColor(subject: string): { bg: string; text: string; accent: string } {
  if (!subject || subject === "測驗") return TEST_COLOR;
  return PALETTE[hashString(subject) % PALETTE.length];
}
