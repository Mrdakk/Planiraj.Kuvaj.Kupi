export const MIN_IMPORT_TEXT_LENGTH = 40;

export function pastedTextReady(text: string): boolean {
  return text.trim().length >= MIN_IMPORT_TEXT_LENGTH;
}

export function materialIsTooShort(text: string): boolean {
  return !pastedTextReady(text);
}

export function isMediaContentType(contentType: string | null | undefined): boolean {
  const type = (contentType ?? '').toLowerCase();
  return type.startsWith('video/') || type.startsWith('audio/');
}

export function isMediaPath(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /\.(mp4|webm|m3u8|mp3|m4a)$/.test(path);
  } catch {
    return false;
  }
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function captionFromTikTokOembed(payload: Record<string, unknown>): string {
  const title = String(payload.title ?? '').trim();
  const html = String(payload.html ?? '');
  const paragraph = html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  const caption = paragraph ? stripTags(paragraph[1]) : '';
  if (title && caption && caption.includes(title)) return caption;
  return [title, caption].filter(Boolean).join('\n');
}

export function youtubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
      return id || null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const shorts = parsed.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts?.[1]) return shorts[1];
      const v = parsed.searchParams.get('v');
      if (v) return v;
    }
  } catch {
    return null;
  }
  return null;
}

export type CaptionTrack = { languageCode?: string; baseUrl?: string };

export function captionTracksFromWatchHtml(html: string): CaptionTrack[] {
  const match = html.match(/"captionTracks":(\[[^\]]*\])/);
  if (!match) return [];
  try {
    return JSON.parse(match[1]) as CaptionTrack[];
  } catch {
    return [];
  }
}

const CAPTION_LANG_RANK = ['sr', 'sr-latn', 'hr', 'bs', 'en'];

export function preferredCaptionTrackUrl(tracks: CaptionTrack[]): string | null {
  const usable = tracks.filter((track) => typeof track.baseUrl === 'string' && track.baseUrl);
  if (usable.length === 0) return null;
  for (const lang of CAPTION_LANG_RANK) {
    const hit = usable.find((track) => (track.languageCode ?? '').toLowerCase() === lang);
    if (hit?.baseUrl) return hit.baseUrl;
  }
  return usable[0].baseUrl ?? null;
}

export function timedTextToPlain(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as { events?: { segs?: { utf8?: string }[] }[] };
      const events = Array.isArray(parsed) ? parsed : parsed.events;
      if (Array.isArray(events)) {
        return events
          .flatMap((event: { segs?: { utf8?: string }[] }) =>
            (event.segs ?? []).map((seg: { utf8?: string }) => seg.utf8 ?? '')
          )
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    } catch {
      // fall through to XML
    }
  }
  const pieces = [...trimmed.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gi)].map((match) =>
    stripTags(decodeHtml(match[1]))
  );
  if (pieces.length > 0) return pieces.join(' ').replace(/\s+/g, ' ').trim();
  return stripTags(trimmed);
}

function metaContent(html: string, key: string): string {
  const property = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i')
  );
  if (property?.[1]) return decodeHtml(property[1]).trim();
  const reversed = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`, 'i')
  );
  return reversed?.[1] ? decodeHtml(reversed[1]).trim() : '';
}

export function instagramMetaFromHtml(html: string): { title: string; description: string } {
  return {
    title: metaContent(html, 'og:title'),
    description: metaContent(html, 'og:description') || metaContent(html, 'description'),
  };
}

export function formatVideoMaterial(
  url: string,
  parts: { title?: string; description?: string; transcript?: string }
): string {
  const lines = [
    `Izvuci recept iz javnog teksta ovog videa (${url}).`,
    'Ne otvaraj URL. Ne izmišljaj sastojke koji nisu u tekstu.',
    'Ako nema recepta, vrati {"error":"Nije pronađen recept na stranici."}',
    '',
  ];
  if (parts.title?.trim()) lines.push(`Naslov: ${parts.title.trim()}`);
  if (parts.description?.trim()) lines.push(`Opis: ${parts.description.trim()}`);
  if (parts.transcript?.trim()) lines.push(`Transkript: ${parts.transcript.trim()}`);
  return lines.join('\n');
}

export function joinedVideoText(parts: { title?: string; description?: string; transcript?: string }): string {
  return [parts.title, parts.description, parts.transcript]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join('\n');
}

const FETCH_TIMEOUT_MS = 15_000;

export type VideoTextFetch = (url: string, init?: RequestInit) => Promise<Response>;

function withTimeout(signal?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  // Clear timeout when aborted so we don't leak in Deno.
  controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  return controller.signal;
}

async function fetchText(
  fetchImpl: VideoTextFetch,
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; text: string; contentType: string }> {
  if (isMediaPath(url)) return { ok: false, text: '', contentType: '' };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, text: '', contentType: '' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, text: '', contentType: '' };
  }

  try {
    const response = await fetchImpl(url, {
      redirect: 'follow',
      ...init,
      signal: withTimeout(init?.signal ?? undefined),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sr-RS,sr;q=0.9,en-US;q=0.8,en;q=0.7',
        ...(init?.headers ?? {}),
      },
    });
    const contentType = response.headers.get('content-type') ?? '';
    if (isMediaContentType(contentType)) return { ok: false, text: '', contentType };
    if (!response.ok) return { ok: false, text: '', contentType };
    const text = await response.text();
    return { ok: true, text, contentType };
  } catch {
    return { ok: false, text: '', contentType: '' };
  }
}

async function collectTikTok(url: string, fetchImpl: VideoTextFetch) {
  const oembed = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  const page = await fetchText(fetchImpl, oembed);
  if (!page.ok) return { title: '', description: '', transcript: '' };
  try {
    const payload = JSON.parse(page.text) as Record<string, unknown>;
    const combined = captionFromTikTokOembed(payload);
    return { title: String(payload.title ?? '').trim(), description: combined, transcript: '' };
  } catch {
    return { title: '', description: '', transcript: '' };
  }
}

async function collectYouTube(url: string, fetchImpl: VideoTextFetch) {
  const id = youtubeVideoId(url);
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const oembed = await fetchText(fetchImpl, oembedUrl);
  let title = '';
  if (oembed.ok) {
    try {
      const payload = JSON.parse(oembed.text) as { title?: string; author_name?: string };
      title = [payload.title, payload.author_name].filter(Boolean).join(' — ');
    } catch {
      title = '';
    }
  }

  const watchUrl = id ? `https://www.youtube.com/watch?v=${id}` : url;
  const watch = await fetchText(fetchImpl, watchUrl);
  const trackUrl = preferredCaptionTrackUrl(captionTracksFromWatchHtml(watch.ok ? watch.text : ''));
  let transcript = '';
  if (trackUrl && !isMediaPath(trackUrl)) {
    const timed = await fetchText(fetchImpl, trackUrl);
    if (timed.ok) transcript = timedTextToPlain(timed.text);
  }
  return { title, description: '', transcript };
}

async function collectInstagram(url: string, fetchImpl: VideoTextFetch) {
  const page = await fetchText(fetchImpl, url);
  if (!page.ok) return { title: '', description: '', transcript: '' };
  const meta = instagramMetaFromHtml(page.text);
  return { title: meta.title, description: meta.description, transcript: '' };
}

export async function collectVideoText(
  url: string,
  fetchImpl: VideoTextFetch = fetch
): Promise<{ title: string; description: string; transcript: string }> {
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  if (host.includes('tiktok.com')) return collectTikTok(url, fetchImpl);
  if (host.includes('instagram.com')) return collectInstagram(url, fetchImpl);
  if (host.includes('youtube.com') || host === 'youtu.be') return collectYouTube(url, fetchImpl);
  return { title: '', description: '', transcript: '' };
}
