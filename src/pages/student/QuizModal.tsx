import { useState } from "react";
import { api, type KnowledgePoint, type Question } from "../../api";

export function QuizModal({
  knowledgePoint,
  onClose,
  onFinished,
}: {
  knowledgePoint: KnowledgePoint;
  onClose: () => void;
  onFinished: () => void;
}) {
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
        <h3>出題練習：{knowledgePoint.title}</h3>
        <p className="hint">會根據您上傳的文件內容，一次出一份完整的練習題（不分難度）。</p>

        <button className="primary" onClick={generate} disabled={loading}>
          {loading ? "出題中...（可能需要十幾秒，請耐心等候）" : hasGenerated ? "重新出題" : "產生題目"}
        </button>

        {aiUnavailable && (
          <p className="error">
            目前 AI 暫時無法連線（可能是流量較高），沒有辦法產生題目，請稍後再按一次「重新出題」試試看。
          </p>
        )}

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
              提交答案
            </button>
            {results[q.id] && (
              <p className={results[q.id].isCorrect ? "feedback ok" : "feedback bad"}>{results[q.id].feedback}</p>
            )}
          </div>
        ))}

        <button className="link" onClick={onClose}>
          關閉
        </button>
      </div>
    </div>
  );
}
