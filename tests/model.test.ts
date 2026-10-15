import assert from "node:assert/strict";
import { test } from "node:test";
import { allSettled, fork, scopeBind } from "effector";
import {
  AppGate,
  $participants,
  $winnerIndex,
  $rollingStartIndex,
  $finished,
  $winnerCopyStatus,
  $urlCopyStatus,
  participantsChanged,
  participantsOpened,
  participantsClosed,
  selectClicked,
  copyWinnerClicked,
  copyUrlClicked,
  resultHidden,
  chooseWinnerFx,
  waitForSelectionFx,
  saveParticipantsFx,
  copyWinnerFx,
  copyUrlFx,
} from "../src/model.ts";
import { participantsUrl, readParticipants } from "../src/participants.ts";

function createScope() {
  return fork({ handlers: [
    [saveParticipantsFx, () => {}],
    [chooseWinnerFx, ({ version }) => ({ index: 0, version })],
    [waitForSelectionFx, async (version) => version],
    [copyWinnerFx, async () => {}],
    [copyUrlFx, async () => {}],
  ] });
}

test("browser navigation stays in its scope and cleans up its listener on unmount", async (context) => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const listeners = new Set<() => void>();
  const browser = {
    location: { href: participantsUrl(new URL("https://example.com/roulette/"), ["Анна"]).href },
    addEventListener: (event: string, listener: () => void) => {
      assert.equal(event, "popstate");
      listeners.add(listener);
    },
    removeEventListener: (event: string, listener: () => void) => {
      assert.equal(event, "popstate");
      listeners.delete(listener);
    },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  context.after(() => {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  });

  const scope = fork();
  const otherScope = fork();
  // Gate lifecycle is driven explicitly here to exercise mount/unmount without React.
  await allSettled(AppGate.open, { scope, params: {} });
  assert.deepEqual(scope.getState($participants), ["Анна"]);
  assert.equal(listeners.size, 1);

  browser.location.href = participantsUrl(new URL(browser.location.href), ["Борис"]).href;
  for (const listener of listeners) listener();
  await allSettled(scope);
  assert.deepEqual(scope.getState($participants), ["Борис"]);
  assert.deepEqual(otherScope.getState($participants), []);
  assert.deepEqual($participants.getState(), []);

  await allSettled(AppGate.close, { scope, params: {} });
  assert.equal(listeners.size, 0);
  await allSettled(AppGate.open, { scope, params: {} });
  assert.equal(listeners.size, 1);
  await allSettled(AppGate.close, { scope, params: {} });
  assert.equal(listeners.size, 0);
});

test("shared URLs preserve names, other parameters and hash, including an empty list", () => {
  const original = new URL("https://example.com/roulette/?theme=dark#section");
  const participants = ["Анна", "Борис & Co", 'Имя с "кавычками"', "Анна"];
  const url = participantsUrl(original, participants);
  assert.deepEqual(readParticipants(url), participants);
  assert.equal(url.searchParams.get("theme"), "dark");
  assert.equal(url.hash, "#section");
  assert.equal(original.searchParams.has("participants"), false);
  assert.deepEqual(readParticipants(participantsUrl(original, [])), []);
  assert.deepEqual(readParticipants(original), []);
  assert.deepEqual(readParticipants(new URL("https://example.com/?participants=broken")), []);
  assert.deepEqual(readParticipants(new URL("https://example.com/?participants=[1]")), []);
});

test("editing normalizes participants and saves them; opening the dialog does not save", async () => {
  const saved: string[][] = [];
  const scope = fork({ handlers: [[saveParticipantsFx, (participants) => saved.push(participants)]] });
  await allSettled(participantsOpened, { scope });
  assert.equal(saved.length, 0);
  await allSettled(participantsChanged, { scope, params: " Анна \n\nБорис\r\n " });
  assert.deepEqual(scope.getState($participants), ["Анна", "Борис"]);
  assert.deepEqual(saved, [["Анна", "Борис"]]);
});

test("an empty list cannot start selection", async () => {
  const scope = createScope();
  await allSettled(selectClicked, { scope });
  assert.equal(scope.getState($winnerIndex), null);
  assert.equal(scope.getState($finished), false);
});

test("a completed selection can spin again and ignores clicks while spinning", async () => {
  const nextSelection = Promise.withResolvers<number>();
  let selections = 0;
  let nextVersion = -1;
  const scope = fork({ handlers: [
    [saveParticipantsFx, () => {}],
    [chooseWinnerFx, ({ version }) => ({ index: ++selections % 2, version })],
    [waitForSelectionFx, (version) => {
      if (selections === 1) return Promise.resolve(version);
      nextVersion = version;
      return nextSelection.promise;
    }],
  ] });
  await allSettled(participantsChanged, { scope, params: "Анна\nБорис" });
  await allSettled(selectClicked, { scope });
  assert.equal(scope.getState($finished), true);
  assert.equal(scope.getState($winnerIndex), 1);
  assert.equal(scope.getState($rollingStartIndex), 0);

  const spinning = allSettled(selectClicked, { scope });
  assert.equal(scope.getState($finished), false);
  assert.equal(scope.getState($winnerIndex), 0);
  assert.equal(scope.getState($rollingStartIndex), 1);
  scopeBind(selectClicked, { scope })();
  assert.equal(selections, 2);

  nextSelection.resolve(nextVersion);
  await spinning;
  assert.equal(scope.getState($finished), true);
  assert.equal(scope.getState($winnerIndex), 0);
});

test("a completed selection copies its winner, then resets after the disappearance", async () => {
  let copied = "";
  const copyScope = fork({ handlers: [
    [saveParticipantsFx, () => {}],
    [chooseWinnerFx, ({ version }) => ({ index: 0, version })],
    [waitForSelectionFx, async (version) => version],
    [copyWinnerFx, async ({ text }) => { copied = text; }],
  ] });
  await allSettled(participantsChanged, { scope: copyScope, params: "Анна\nБорис" });
  await allSettled(selectClicked, { scope: copyScope });
  assert.equal(copyScope.getState($finished), true);
  await allSettled(copyWinnerClicked, { scope: copyScope });
  assert.equal(copied, "Анна");
  assert.equal(copyScope.getState($winnerCopyStatus), "leaving");
  await allSettled(resultHidden, { scope: copyScope });
  assert.equal(copyScope.getState($winnerIndex), null);
  assert.equal(copyScope.getState($finished), false);
  assert.equal(copyScope.getState($winnerCopyStatus), "idle");
});

test("editing during selection ignores the old timer and resets the result", async () => {
  const { promise, resolve } = Promise.withResolvers<number>();
  let selectionVersion = -1;
  const scope = fork({ handlers: [
    [saveParticipantsFx, () => {}],
    [chooseWinnerFx, ({ version }) => ({ index: 0, version })],
    [waitForSelectionFx, (version) => { selectionVersion = version; return promise; }],
  ] });
  await allSettled(participantsChanged, { scope, params: "Анна" });
  const selection = allSettled(selectClicked, { scope });
  scopeBind(participantsChanged, { scope })("Борис");
  assert.equal(scope.getState($winnerIndex), null);
  resolve(selectionVersion);
  await selection;
  assert.equal(scope.getState($finished), false);
  assert.deepEqual(scope.getState($participants), ["Борис"]);
});

test("a failed clipboard write shows an error and allows retrying", async () => {
  let attempts = 0;
  const scope = fork({ handlers: [[copyUrlFx, async () => {
    if (++attempts === 1) throw new Error("Clipboard unavailable");
  }]] });
  await allSettled(participantsOpened, { scope });
  await allSettled(copyUrlClicked, { scope });
  assert.equal(scope.getState($urlCopyStatus), "error");
  await allSettled(copyUrlClicked, { scope });
  assert.equal(scope.getState($urlCopyStatus), "success");
});

test("closing and reopening the dialog ignores a previous clipboard response", async () => {
  const { promise, resolve } = Promise.withResolvers<void>();
  const scope = fork({ handlers: [[copyUrlFx, () => promise]] });
  await allSettled(participantsOpened, { scope });
  const copying = allSettled(copyUrlClicked, { scope });
  const close = scopeBind(participantsClosed, { scope });
  const open = scopeBind(participantsOpened, { scope });
  close();
  open();
  resolve();
  await copying;
  assert.equal(scope.getState($urlCopyStatus), "idle");
});
