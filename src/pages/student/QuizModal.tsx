import { useState } from "react";
import { api, type KnowledgePoint, type Question } from "../../api";
import { useLang } from "../../i18n";

export function QuizModal({
  knowledgePoint,
  onClose,
  onFinished,
}: {
  knowledgePoint: KnowledgePoint;
  onClose: () => void;
  onFinished: () => void;
}) {
  const { t } = useLang();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, { isCorrect: boolean; feedback: string }>>({});
  const [loading, setLoading] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  async function generate() {
    setLoading(true);
    setAiUnavailable(false);
    try {
      const r = await api.generateQuiz({ knowledgePointId: knowledgePoint.id });
      setQuestions(r.questions);
      setAnswers({});
      setResults({});
      setAiUnavailable(!r.aiAvailable);
      setHasGenerated(true);
    } finally {
      setLoading(false);
    }
  }

  async function submit(q: Question) {
    const r = await api.submitQuiz({ questionId: q.id, answer: answers[q.id] || "" });
    setResults((prev) => ({ ...prev, [q.id]: r }));
    onFinished();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          {t("quiz.titlePrefix")}
          {knowledgePoint.title}
        </h3>
        <p className="hint">{t("quiz.hint")}</p>

        <button className="primary" onClick={generate} disabled={loading}>
          {loading ? t("quiz.generating") : hasGenerated ? t("quiz.regenerate") : t("quiz.generate")}
        </button>

        {aiUnavailable && <p className="error">{t("quiz.aiUnavailable")}</p>}

        {questions.map((q) => (
          <div key={q.id} className="question">
            <p>{q.content}</p>
            {q.options ? (
              q.options.map((opt) => (
                <label key={opt} className="choice">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                  />
                  {opt}
                </label>
              ))
            ) : (
              <input
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              />
            )}
            <button onClick={() => submit(q)} disabled={!answers[q.id]}>
              {t("quiz.submit")}
            </button>
            {results[q.id] && (
              <p className={results[q.id].isCorrect ? "feedback ok" : "feedback bad"}>{results[q.id].feedback}</p>
            )}
          </div>
        ))}

        <button className="link" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}
