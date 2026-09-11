import { useEffect, useState } from "react";
import users from "./data/items.json";

export function App() {
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copying" | "leaving" | "error">("idle");

  const copyWinner = async () => {
    if (winnerIndex === null || !finished || copyStatus === "copying" || copyStatus === "leaving") return;

    setCopyStatus("copying");
    try {
      await navigator.clipboard.writeText(users[winnerIndex]);
      setCopyStatus("leaving");
    } catch {
      setCopyStatus("error");
    }
  };

  useEffect(() => {
    if (winnerIndex === null) return;

    const timeout = window.setTimeout(() => setFinished(true), 4000);
    return () => window.clearTimeout(timeout);
  }, [winnerIndex]);

  const started = winnerIndex !== null;

  return (
    <main>
      <h1>Кто следующий?</h1>
      <div className="selection-stage">
        {!finished && (
          <div
            className={`users-layout${started ? " users-layout--leaving" : ""}`}
            inert={started}
            aria-hidden={started}
          >
            <button
              className="discover-button"
              type="button"
              disabled={started}
              onClick={() => setWinnerIndex(Math.floor(Math.random() * users.length))}
            >
              Узнать
            </button>
            <div className="users-marquee" tabIndex={0} aria-label="Пользователи, бегущая строка">
              <div className="users-marquee-track">
                {[0, 1].map((copy) => (
                  <ul key={copy} aria-hidden={copy === 1}>
                    {users.map((user) => (
                      <li key={user}>{user}</li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>
          </div>
        )}
        {started && (
          <div className="selection-result" role="status" aria-live="polite">
            <span className="sr-only">
              {finished ? `Выбран: ${users[winnerIndex]}` : "Выбираем пользователя"}
            </span>
            <div
              className={`rolling-window${copyStatus === "leaving" ? " rolling-window--leaving" : ""}`}
              aria-hidden="true"
            >
              {finished ? (
                <div className="rolling-name">{users[winnerIndex]}</div>
              ) : (
                <div className="rolling-track">
                  {Array.from({ length: users.length * 3 + winnerIndex + 1 }, (_, index) => (
                    <div className="rolling-name" key={index}>
                      {users[index % users.length]}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {finished && (
              <div
                className={`copy-actions${copyStatus === "leaving" ? " copy-actions--leaving" : ""}`}
                onAnimationEnd={(event) => {
                  if (event.target !== event.currentTarget || event.animationName !== "depth-disappear") return;
                  setWinnerIndex(null);
                  setFinished(false);
                  setCopyStatus("idle");
                }}
              >
                <button
                  className="discover-button discover-button--small"
                  type="button"
                  onClick={copyWinner}
                  disabled={copyStatus === "copying" || copyStatus === "leaving"}
                >
                  Скопировать
                </button>
                {copyStatus === "error" && (
                  <p>Не удалось скопировать. Попробуйте ещё раз.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
