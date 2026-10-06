import { useRef, useState, type ChangeEvent } from "react";
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
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) setDocText("");
  }

  async function handleUpload() {
    setError("");
    if (!file && docText.trim().length < 10) {
      setError("請貼上至少 10 個字的文字，或選擇一個檔案");
      return;
    }
    setUploading(true);
    try {
      if (file) {
        await api.uploadDocumentFile(file, subject.trim() || "未分類");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        await api.uploadDocument(docText, subject.trim() || "未分類");
        setDocText("");
      }
      onUploaded();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <section className="card">
        <h2>上傳學習文件</h2>
        <p className="hint">可以直接上傳 PDF 或 PowerPoint（.pptx）檔案，也可以貼上文字，AI 會自動拆解出知識點。</p>
        <div className="row">
          <label>
            科目
            <input placeholder="例如：數學" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
        </div>

        <div className="upload-methods">
          <div className="upload-method">
            <p className="method-label">方式一：上傳檔案（PDF / PPTX）</p>
            <input ref={fileInputRef} type="file" accept=".pdf,.pptx" onChange={handleFileChange} />
            {file && <p className="hint">已選擇檔案：{file.name}</p>}
          </div>
          <div className="upload-divider">或</div>
          <div className="upload-method">
            <p className="method-label">方式二：貼上文字</p>
            <textarea
              rows={5}
              value={docText}
              onChange={(e) => {
                setDocText(e.target.value);
                if (e.target.value && file) {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }
              }}
              placeholder="例如：第一章 分數的加減法...&#10;第二章 小數的乘除法..."
            />
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        <button className="primary" onClick={handleUpload} disabled={uploading}>
          {uploading ? "解析中...（可能需要十幾秒，請耐心等候）" : "上傳並解析"}
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
