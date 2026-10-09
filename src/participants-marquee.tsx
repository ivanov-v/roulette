import { useLayoutEffect, useRef, useState } from "react";

type ParticipantsMarqueeProps = {
  participants: string[];
};

export function ParticipantsMarquee({ participants }: ParticipantsMarqueeProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [repetitions, setRepetitions] = useState(1);
  const participantsKey = JSON.stringify(participants);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const list = listRef.current;
    if (!viewport || !list) return;

    const observer = new ResizeObserver(() => {
      const listWidth = Number.parseFloat(getComputedStyle(list).width);
      setRepetitions(listWidth > 0 ? Math.max(1, Math.ceil(viewport.clientWidth / listWidth)) : 1);
    });
    observer.observe(viewport);
    observer.observe(list);
    return () => observer.disconnect();
  }, [participantsKey]);

  return (
    <div ref={viewportRef} className="users-marquee" tabIndex={0} aria-label="Пользователи, бегущая строка">
      <div className="users-marquee-track" key={participantsKey}>
        {[0, 1].map((copy) => (
          <div className="users-marquee-group" key={copy} aria-hidden={copy === 1}>
            {Array.from({ length: repetitions }, (_, repetition) => (
              <ul
                key={repetition}
                ref={copy === 0 && repetition === 0 ? listRef : undefined}
                aria-hidden={copy === 1 || repetition > 0}
              >
                {participants.map((participant, index) => (
                  <li key={index}>{participant}</li>
                ))}
              </ul>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
