import LZString from "lz-string";

const COMPRESSED_PREFIX = "v1.";

export function readParticipants(url: URL): string[] {
  const value = url.searchParams.get("participants");
  if (value === null) return [];

  try {
    const json = value.startsWith(COMPRESSED_PREFIX)
      ? LZString.decompressFromEncodedURIComponent(value.slice(COMPRESSED_PREFIX.length))
      : value;
    if (!json) return [];
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parseParticipants(parsed.join("\n"));
    }
  } catch {
    // A malformed shared link leaves the participant list empty.
  }
  return [];
}

export function parseParticipants(text: string): string[] {
  return text.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
}

export function participantsUrl(url: URL, participants: string[]): URL {
  const nextUrl = new URL(url);
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(participants));
  nextUrl.searchParams.set("participants", `${COMPRESSED_PREFIX}${compressed}`);
  return nextUrl;
}
