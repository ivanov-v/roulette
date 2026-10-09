import { useEffect, useRef } from "react";
import { useUnit } from "effector-react";
import {
  $participantsText,
  $urlCopyStatus,
  participantsChanged,
  participantsClosed,
  copyUrlClicked,
} from "./model";

export function ParticipantsDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { value, copyStatus, onChange, onClose, copyUrl } = useUnit({
    value: $participantsText,
    copyStatus: $urlCopyStatus,
    onChange: participantsChanged,
    onClose: participantsClosed,
    copyUrl: copyUrlClicked,
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog ref={dialogRef} className="participants-dialog" aria-labelledby="participants-title" onClose={onClose}>
      <form onSubmit={(event) => event.preventDefault()}>
        <div className="participants-heading">
          <h2 id="participants-title">Участники</h2>
          <button className="secondary-button" type="button" onClick={() => dialogRef.current?.close()} aria-label="Закрыть">✕</button>
        </div>
        <label htmlFor="participants-list">Список участников</label>
        <p id="participants-hint">Один участник на строку. Изменения сразу сохраняются в ссылке.</p>
        <textarea
          id="participants-list"
          aria-describedby="participants-hint"
          rows={10}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button className="discover-button discover-button--small" type="button" disabled={copyStatus === "copying"} onClick={copyUrl}>
          {copyStatus === "copying" ? "Копируем…" : "Скопировать URL с участниками"}
        </button>
        <p className="participants-copy-status" role="status">
          {copyStatus === "success" && "Ссылка скопирована."}
          {copyStatus === "error" && "Не удалось скопировать. Скопируйте ссылку из адресной строки."}
        </p>
      </form>
    </dialog>
  );
}
