import { useEffect, useRef, useState } from "react";
import items from "./data/items.json";

const DEMO_INTERVAL_MS = 2000;
const ROULETTE_DURATION_MS = 7000;
const DONE_DURATION_MS = 4000;

type RouletteMode = "demo" | "spinning" | "done";

const getRandomIndex = (length: number) => Math.floor(Math.random() * length);

export function App() {
  const [activeIndex, setActiveIndex] = useState(() =>
    getRandomIndex(items.length),
  );
  const [mode, setMode] = useState<RouletteMode>("demo");
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const doneTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (mode !== "demo") {
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setActiveIndex(getRandomIndex(items.length));
    }, DEMO_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [mode]);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      if (doneTimeoutRef.current !== null) {
        window.clearTimeout(doneTimeoutRef.current);
      }
    };
  }, []);

  const startRoulette = () => {
    if (mode === "spinning") {
      return;
    }

    if (mode === "done") {
      void copyActiveItem();
      return;
    }

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const winnerIndex = getRandomIndex(items.length);
    const startedAt = Date.now();

    setMode("spinning");

    const spin = () => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(elapsed / ROULETTE_DURATION_MS, 1);
      const delay = 60 + progress ** 2.8 * 340;

      if (progress >= 1) {
        setActiveIndex(winnerIndex);
        setMode("done");
        timeoutRef.current = null;
        doneTimeoutRef.current = window.setTimeout(() => {
          setMode("demo");
          doneTimeoutRef.current = null;
        }, DONE_DURATION_MS);
        return;
      }

      setActiveIndex(getRandomIndex(items.length));
      timeoutRef.current = window.setTimeout(spin, delay);
    };

    spin();
  };

  const activeItem = items[activeIndex];

  const copyActiveItem = async () => {
    await navigator.clipboard.writeText(activeItem);
  };

  return (
    <div className="main">
      <h1>Кто следующий?</h1>

      <div className="container">
        <div className="list">
          {items.map((item, index) => (
            <div
              className={[
                "item",
                index === activeIndex ? "item--active" : "",
                mode === "done" && index === activeIndex
                  ? "item--selected"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={item}
            >
              {item}
            </div>
          ))}
        </div>

        <button
          className={[
            "active-item",
            mode === "spinning" ? "active-item--spinning" : "",
            mode === "done" ? "active-item--done" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={startRoulette}
          disabled={mode === "spinning"}
          title={mode === "done" ? "Скопировать имя" : "Запустить рулетку"}
          type="button"
        >
          {activeItem}
        </button>
      </div>
    </div>
  );
}
