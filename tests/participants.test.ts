import assert from "node:assert/strict";
import { test } from "node:test";
import LZString from "lz-string";
import { participantsUrl, readParticipants } from "../src/participants.ts";

test("a compressed link restores 50 participants and is shorter than the previous format", () => {
  const participants = Array.from({ length: 50 }, (_, index) => `Участник ${index + 1} Иванов`);
  const original = new URL("https://example.com/roulette/");
  const legacy = new URL(original);
  legacy.searchParams.set("participants", JSON.stringify(participants));
  const compressed = participantsUrl(original, participants);

  assert.ok(compressed.searchParams.get("participants")?.startsWith("v1."));
  assert.deepEqual(readParticipants(compressed), participants);
  assert.ok(compressed.href.length < legacy.href.length);
});

test("existing JSON links still restore names and migrate to compressed links when saved", () => {
  const participants = ["Анна", "Борис & Co", "😀", "Анна"];
  const legacy = new URL("https://example.com/roulette/?theme=dark#section");
  legacy.searchParams.set("participants", JSON.stringify(participants));

  assert.deepEqual(readParticipants(legacy), participants);
  const migrated = participantsUrl(legacy, readParticipants(legacy));
  assert.deepEqual(readParticipants(migrated), participants);
  assert.ok(migrated.searchParams.get("participants")?.startsWith("v1."));
  assert.equal(migrated.searchParams.get("theme"), "dark");
  assert.equal(migrated.hash, "#section");
});

test("corrupted compressed links and invalid decoded data leave the list empty", () => {
  const url = new URL("https://example.com/roulette/");
  const invalidValues = [
    "v1.",
    "v1.broken",
    "v2.unknown",
    `v1.${LZString.compressToEncodedURIComponent("not JSON")}`,
    `v1.${LZString.compressToEncodedURIComponent(JSON.stringify([123]))}`,
    `v1.${LZString.compressToEncodedURIComponent(JSON.stringify({ name: "Анна" }))}`,
  ];
  for (const value of invalidValues) {
    url.searchParams.set("participants", value);
    assert.deepEqual(readParticipants(url), [], value);
  }
});
