import { useRef, useState, type ChangeEvent } from "react";
import { api, type KnowledgePoint } from "../../api";
import { subjectColor } from "../../colors";
import { translateLabel, useLanguage } from "../../i18n";

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
  const { t } = useLanguage();
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
      setError(t("uploadMinLengthError"));
      return;
    }
    setUploading(true);
    try {
      if (file) {
        await api.uploadDocumentFile(file, subject.trim() || t("unclassifiedSubject"));
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        await api.uploadDocument(docText, subject.trim() || t("unclassifiedSubject"));
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
        <h2>{t("uploadTitle")}</h2>
        <p className="hint">{t("uploadHint")}</p>
        <div className="row">
          <label>
            {t("subjectLabel")}
            <input placeholder={t("subjectPlaceholder")} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
        </div>

        <div className="upload-methods">
          <div className="upload-method">
            <p className="method-label">{t("methodFile")}</p>
            <input ref={fileInputRef} type="file" accept=".pdf,.pptx" onChange={handleFileChange} />
            {file && <p className="hint">{t("fileSelected", { name: file.name })}</p>}
          </div>
          <div className="upload-divider">{t("or")}</div>
          <div className="upload-method">
            <p className="method-label">{t("methodText")}</p>
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
              placeholder={t("textPlaceholder")}
            />
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        <button className="primary" onClick={handleUpload} disabled={uploading}>
          {uploading ? t("uploading") : t("uploadSubmit")}
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
                  <span className={`level-tag ${kp.level}`}>{translateLabel(t, kp.level)}</span>
                  {kp.title}
                  <span className="minutes">{t("aboutMinutes", { n: kp.estMinutes })}</span>
                  <button className="link" onClick={() => onOpenQuiz(kp)}>
                    {t("practiceButton")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {weakPoints.length > 0 && (
        <section className="card">
          <h2>{t("weakPoints")}</h2>
          <ul>
            {weakPoints.map((w, i) => (
              <li key={i}>
                {w.title} — {t("wrongCount", { n: w.wrongCount })}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
