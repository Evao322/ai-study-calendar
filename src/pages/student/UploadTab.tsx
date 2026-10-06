import { useState } from "react";
import { api, type KnowledgePoint } from "../../api";
import { subjectColor } from "../../colors";

export function UploadTab({
  knowledgePoints,
  weakPoints,
  onUploaded,
  onOpenQuiz,
}: {
  knowledgePoints: KnowledgePoint[];
  weakPoints: { title: string; wrongCount: number }[];
  onUploaded: () => void;
  onOpenQuiz: (kp: KnowledgePoint) => void;
}) {
  const [subject, setSubject] = useState("");
  const [docText, setDocText] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (docText.trim().length < 10) return;
    setUploading(true);
    try {
      await api.uploadDocument(docText, subject.trim() || "未分類");
      setDocText("");
      onUploaded();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <section className="card">
        <h2>上傳學習文件</h2>
        <p className="hint">先貼上課本或講義的文字內容，AI 會自動拆解出知識點（之後會支援直接上傳 PDF/Word）。</p>
        <div className="row">
          <label>
            科目
            <input placeholder="例如：數學" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
        </div>
        <textarea
          rows={5}
          value={docText}
          onChange={(e) => setDocText(e.target.value)}
          placeholder="例如：第一章 分數的加減法...&#10;第二章 小數的乘除法..."
        />
        <button className="primary" onClick={handleUpload} disabled={uploading}>
          {uploading ? "解析中..." : "上傳並解析"}
        </button>

        {knowledgePoints.length > 0 && (
          <ul className="kp-list">
            {knowledgePoints.map((kp) => {
              const c = subjectColor(kp.subject);
              return (
                <li key={kp.id}>
                  <span className="subject-chip" style={{ background: c.bg, color: c.text }}>
                    {kp.subject}
                  </span>
                  <span className={`level-tag ${kp.level}`}>{kp.level}</span>
                  {kp.title}
                  <span className="minutes">約 {kp.estMinutes} 分鐘</span>
                  <button className="link" onClick={() => onOpenQuiz(kp)}>
                    出題練習
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {weakPoints.length > 0 && (
        <section className="card">
          <h2>薄弱知識點</h2>
          <ul>
            {weakPoints.map((w, i) => (
              <li key={i}>
                {w.title} — 錯了 {w.wrongCount} 次
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
