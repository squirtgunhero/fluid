import { fetchText } from "./http";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const SUNO_HOST = /(^|\.)suno\.(com|ai)$/i;

export type SunoSong = {
  id: string;
  title: string;
  artist?: string;
  page: string;
  audioUrl: string;
  coverUrl: string;
};

export const sunoPageUrl = (id: string) => `https://suno.com/song/${id}`;
export const sunoAudioUrl = (id: string) => `https://cdn1.suno.ai/${id}.mp3`;
export const sunoCoverUrl = (id: string) => `https://cdn2.suno.ai/image_${id}.jpeg`;

/** Does this look like something from Suno at all? */
export function isSunoInput(input: string): boolean {
  const s = input.trim();
  if (UUID.test(s)) return true;
  try {
    return SUNO_HOST.test(new URL(s).hostname);
  } catch {
    return false;
  }
}

/** The song UUID from a share link, a song page URL or a bare ID. */
export function parseSunoId(input: string): string | null {
  const m = input.trim().match(UUID);
  return m ? m[0].toLowerCase() : null;
}

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const meta = (html: string, property: string): string | undefined => {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
    "i",
  );
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
    "i",
  );
  const m = html.match(re) ?? html.match(alt);
  return m ? decodeEntities(m[1]) : undefined;
};

/** "Song Title by Artist | Suno" → { title, artist } */
export function splitSunoTitle(raw: string): { title: string; artist?: string } {
  const clean = raw.replace(/\s*[|·-]\s*Suno\s*$/i, "").trim();
  const by = clean.match(/^(.*)\s+by\s+(.+)$/i);
  if (by) return { title: by[1].trim(), artist: by[2].trim() };
  return { title: clean };
}

/**
 * Resolve a Suno link to a playable song. The share page's Open Graph tags
 * give the title, artist and art; where the page cannot be read (CORS in a
 * plain browser, a private song) we fall back to the CDN pattern and a
 * generic title, so the link is still playable if the audio is public.
 */
export async function resolveSuno(input: string): Promise<SunoSong | null> {
  let id = parseSunoId(input);
  let html: string | null = null;

  if (!id) {
    // Short share links redirect to the song page; the page carries the ID.
    html = await fetchText(input.trim());
    id = html ? parseSunoId(html) : null;
    if (!id) return null;
  }

  const page = sunoPageUrl(id);
  if (!html) html = await fetchText(page);

  let title = `Suno · ${id.slice(0, 8)}`;
  let artist: string | undefined;
  let coverUrl = sunoCoverUrl(id);
  let audioUrl = sunoAudioUrl(id);

  if (html) {
    const og = meta(html, "og:title") ?? meta(html, "twitter:title");
    if (og) ({ title, artist } = splitSunoTitle(og));
    coverUrl = meta(html, "og:image") ?? coverUrl;
    audioUrl = meta(html, "og:audio") ?? meta(html, "og:audio:url") ?? audioUrl;
  }

  return { id, title, artist, page, audioUrl, coverUrl };
}
