import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { fork } from "effector";
import { Provider } from "effector-react";
import { App } from "./app";
import "@fontsource-variable/roboto/wght.css";
import "./index.css";

const scope = fork();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider value={scope}>
      <App />
    </Provider>
  </StrictMode>,
);
