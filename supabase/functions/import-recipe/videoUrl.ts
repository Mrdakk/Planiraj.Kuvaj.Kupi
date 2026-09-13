export function isVideoImportUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const path = parsed.pathname.toLowerCase();

  if (
    host === 'tiktok.com' ||
    host === 'm.tiktok.com' ||
    host === 'vm.tiktok.com' ||
    host === 'vt.tiktok.com'
  ) {
    return true;
  }

  if (host === 'instagram.com') {
    return /\/(reel|reels|p)(\/|$)/.test(path);
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    return path.includes('/shorts/') || path.includes('/watch') || parsed.searchParams.has('v');
  }

  if (host === 'youtu.be') {
    return path.replace(/^\//, '').length > 0;
  }

  return false;
}
