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
  const [difficulty, setDifficulty] = useState("basic");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, { isCorrect: boolean; feedback: string }>>({});
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const r = await api.generateQuiz({ knowledgePointId: knowledgePoint.id, difficulty, count: 3 });
      setQuestions(r.questions);
      setAnswers({});
      setResults({});
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
        <div className="row">
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="basic">基礎題</option>
            <option value="advanced">提升題</option>
            <option value="extension">拓展題</option>
          </select>
          <button onClick={generate} disabled={loading}>
            {loading ? "出題中..." : "產生題目"}
          </button>
        </div>

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
