import { useGate, useUnit } from "effector-react";
import { ParticipantsDialog } from "./participants-dialog";
import {
  AppGate,
  $participants,
  $participantsOpen,
  $winnerIndex,
  $winner,
  $started,
  $finished,
  $winnerCopyStatus,
  participantsOpened,
  selectClicked,
  copyWinnerClicked,
  resultHidden,
} from "./model";

export function App() {
  useGate(AppGate);
  const { users, participantsOpen, winnerIndex, winner, started, finished, copyStatus, openParticipants, select, copyWinner, hideResult } = useUnit({
    users: $participants,
    participantsOpen: $participantsOpen,
    winnerIndex: $winnerIndex,
    winner: $winner,
    started: $started,
    finished: $finished,
    copyStatus: $winnerCopyStatus,
    openParticipants: participantsOpened,
    select: selectClicked,
    copyWinner: copyWinnerClicked,
    hideResult: resultHidden,
  });

  return (
    <main>
      <h1>Кто следующий?</h1>
      {participantsOpen && <ParticipantsDialog />}
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
              disabled={started || users.length === 0}
              onClick={select}
            >
              Узнать
            </button>
            <div className="participants-section">
              <div className="participants-toolbar">
                <button className="secondary-button" type="button" onClick={openParticipants}>Участники · {users.length}</button>
              </div>
              {users.length === 0 && <p>Добавьте участников, чтобы начать выбор.</p>}
            </div>
          </div>
        )}
        {winnerIndex !== null && (
          <div className="selection-result" role="status" aria-live="polite">
            <span className="sr-only">
              {finished ? `Выбран: ${winner}` : "Выбираем пользователя"}
            </span>
            {finished && (
              <div className={`result-discover${copyStatus === "leaving" ? " result-discover--leaving" : ""}`}>
                <button
                  className="discover-button"
                  type="button"
                  onClick={select}
                  disabled={copyStatus === "copying" || copyStatus === "leaving"}
                >
                  Узнать ещё
                </button>
              </div>
            )}
            <div
              className={`rolling-window${copyStatus === "leaving" ? " rolling-window--leaving" : ""}`}
              aria-hidden="true"
            >
              {finished ? (
                <div className="rolling-name">{winner}</div>
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
                  hideResult();
                }}
              >
                <button
                  className="secondary-button"
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
