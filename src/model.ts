import { combine, createEffect, createEvent, createStore, sample, scopeBind } from "effector";
import { createAction } from "effector-action";
import { createGate } from "effector-react";
import { parseParticipants, participantsUrl, readParticipants } from "./participants.ts";

export const AppGate = createGate("AppGate");
export const participantsChanged = createEvent<string>();
export const participantsOpened = createEvent();
export const participantsClosed = createEvent();
export const selectClicked = createEvent();
export const copyWinnerClicked = createEvent();
export const copyUrlClicked = createEvent();
export const resultHidden = createEvent();

const participantsRestored = createEvent<string>();
const selectionReset = createEvent();

export const $participantsText = createStore("")
  .on([participantsChanged, participantsRestored], (_, text) => text);
export const $participants = $participantsText.map(parseParticipants);
export const $participantsOpen = createStore(false)
  .on(participantsOpened, () => true)
  .reset(participantsClosed);

const $selectionVersion = createStore(0).on(selectionReset, (version) => version + 1);
const $urlCopyVersion = createStore(0)
  .on([participantsChanged, participantsRestored, participantsOpened, participantsClosed], (version) => version + 1);

export const chooseWinnerFx = createEffect(({ count, version }: { count: number; version: number }) => ({
  index: Math.floor(Math.random() * count),
  version,
}));

export const waitForSelectionFx = createEffect(async (version: number) => {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 4000));
  return version;
});

export const copyWinnerFx = createEffect(async ({ text }: { text: string; version: number }) => {
  await navigator.clipboard.writeText(text);
});

export const copyUrlFx = createEffect(async ({ participants }: { participants: string[]; version: number }) => {
  const url = participantsUrl(new URL(window.location.href), participants);
  await navigator.clipboard.writeText(url.href);
});

export const $winnerIndex = createStore<number | null>(null)
  .reset(selectionReset);
export const $started = $winnerIndex.map((index) => index !== null);
export const $finished = createStore(false).reset(selectionReset);
export const $winner = combine($participants, $winnerIndex, (participants, index) => index === null ? null : participants[index] ?? null);

export const $winnerCopyStatus = createStore<"idle" | "copying" | "leaving" | "error">("idle")
  .on(copyWinnerFx, () => "copying")
  .reset(selectionReset);
export const $urlCopyStatus = createStore<"idle" | "copying" | "success" | "error">("idle")
  .on(copyUrlFx, () => "copying")
  .reset([participantsChanged, participantsRestored, participantsOpened, participantsClosed]);

const initializeBrowserFx = createEffect(() => {
  const restore = scopeBind(participantsRestored);
  const onPopstate = () => restore(readParticipants(new URL(window.location.href)).join("\n"));
  window.addEventListener("popstate", onPopstate);
  return {
    text: readParticipants(new URL(window.location.href)).join("\n"),
    unsubscribe: () => window.removeEventListener("popstate", onPopstate),
  };
});
const unsubscribeNavigationFx = createEffect((unsubscribe: (() => void) | null) => unsubscribe?.());
const $unsubscribeNavigation = createStore<(() => void) | null>(null, { serialize: "ignore" })
  .reset(unsubscribeNavigationFx.done);

export const saveParticipantsFx = createEffect((participants: string[]) => {
  const url = participantsUrl(new URL(window.location.href), participants);
  window.history.replaceState(window.history.state, "", url);
});

sample({ clock: AppGate.open, target: initializeBrowserFx });
createAction(initializeBrowserFx.doneData, {
  target: { $unsubscribeNavigation, participantsRestored },
  fn: (target, { text, unsubscribe }) => {
    target.$unsubscribeNavigation(() => unsubscribe);
    target.participantsRestored(text);
  },
});
sample({ clock: AppGate.close, source: $unsubscribeNavigation, target: unsubscribeNavigationFx });
sample({ clock: participantsChanged, source: $participants, target: saveParticipantsFx });
sample({ clock: [participantsChanged, participantsRestored, resultHidden], target: selectionReset });

createAction(selectClicked, {
  source: { $participants, $started, $finished, $winnerCopyStatus, $selectionVersion },
  target: { selectionReset, chooseWinnerFx },
  fn: (target, { participants, started, finished, winnerCopyStatus, selectionVersion }) => {
    if (participants.length === 0 || (started && !finished) || winnerCopyStatus === "copying" || winnerCopyStatus === "leaving") return;
    target.selectionReset();
    target.chooseWinnerFx({ count: participants.length, version: selectionVersion + 1 });
  },
});
createAction(chooseWinnerFx.doneData, {
  target: { $winnerIndex, waitForSelectionFx },
  fn: (target, { index, version }) => {
    target.$winnerIndex(index);
    target.waitForSelectionFx(version);
  },
});
createAction(waitForSelectionFx.doneData, {
  source: { $selectionVersion },
  target: { $finished },
  fn: (target, { selectionVersion }, completedVersion) => {
    if (selectionVersion === completedVersion) target.$finished(true);
  },
});

createAction(copyWinnerClicked, {
  source: { $winner, $finished, $winnerCopyStatus, $selectionVersion },
  target: { copyWinnerFx },
  fn: (target, { winner, finished, winnerCopyStatus, selectionVersion }) => {
    if (winner === null || !finished || winnerCopyStatus === "copying" || winnerCopyStatus === "leaving") return;
    target.copyWinnerFx({ text: winner, version: selectionVersion });
  },
});
createAction(copyWinnerFx.finally, {
  source: { $selectionVersion },
  target: { $winnerCopyStatus },
  fn: (target, { selectionVersion }, { params, status }) => {
    if (selectionVersion !== params.version) return;
    target.$winnerCopyStatus(status === "done" ? "leaving" : "error");
  },
});

createAction(copyUrlClicked, {
  source: { $participants, $urlCopyVersion, $urlCopyStatus, $participantsOpen },
  target: { copyUrlFx },
  fn: (target, { participants, urlCopyVersion, urlCopyStatus, participantsOpen }) => {
    if (!participantsOpen || urlCopyStatus === "copying") return;
    target.copyUrlFx({ participants, version: urlCopyVersion });
  },
});
createAction(copyUrlFx.finally, {
  source: { $urlCopyVersion },
  target: { $urlCopyStatus },
  fn: (target, { urlCopyVersion }, { params, status }) => {
    if (urlCopyVersion !== params.version) return;
    target.$urlCopyStatus(status === "done" ? "success" : "error");
  },
});
