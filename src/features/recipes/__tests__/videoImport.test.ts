import { describe, expect, it } from '@jest/globals';
import { isVideoImportUrl } from '../../../../supabase/functions/import-recipe/videoUrl';
import {
  captionFromTikTokOembed,
  instagramMetaFromHtml,
  isMediaContentType,
  isMediaPath,
  materialIsTooShort,
  pastedTextReady,
  preferredCaptionTrackUrl,
  timedTextToPlain,
  youtubeVideoId,
} from '../../../../supabase/functions/import-recipe/videoText';
import { importSourceNote } from '../importFromUrl';

describe('isVideoImportUrl', () => {
  it('accepts TikTok, Reels, Shorts and watch links', () => {
    expect(isVideoImportUrl('https://www.tiktok.com/@cook/video/123')).toBe(true);
    expect(isVideoImportUrl('https://vm.tiktok.com/ZMabc/')).toBe(true);
    expect(isVideoImportUrl('https://www.instagram.com/reel/AbC/')).toBe(true);
    expect(isVideoImportUrl('https://www.instagram.com/p/AbC/')).toBe(true);
    expect(isVideoImportUrl('https://www.youtube.com/shorts/abcdefghijk')).toBe(true);
    expect(isVideoImportUrl('https://www.youtube.com/watch?v=abcdefghijk')).toBe(true);
    expect(isVideoImportUrl('https://youtu.be/abcdefghijk')).toBe(true);
  });

  it('rejects recipe pages, profiles and non-http', () => {
    expect(isVideoImportUrl('https://www.coolinarika.com/recept/musaka')).toBe(false);
    expect(isVideoImportUrl('https://www.instagram.com/someuser')).toBe(false);
    expect(isVideoImportUrl('ftp://www.tiktok.com/@x/video/1')).toBe(false);
  });
});

describe('video text parsers', () => {
  it('joins TikTok oEmbed title and caption paragraph', () => {
    const text = captionFromTikTokOembed({
      title: 'Musaka od krompira',
      html: '<blockquote><p>500 g mesa #recept</p></blockquote>',
    });
    expect(text).toContain('Musaka od krompira');
    expect(text).toContain('500 g mesa');
  });

  it('reads YouTube ids from watch, shorts and youtu.be', () => {
    expect(youtubeVideoId('https://www.youtube.com/watch?v=abcdefghijk')).toBe('abcdefghijk');
    expect(youtubeVideoId('https://www.youtube.com/shorts/abcdefghijk')).toBe('abcdefghijk');
    expect(youtubeVideoId('https://youtu.be/abcdefghijk')).toBe('abcdefghijk');
  });

  it('prefers Serbian caption tracks then English then the first', () => {
    const tracks = [
      { languageCode: 'en', baseUrl: 'https://example.com/en' },
      { languageCode: 'sr', baseUrl: 'https://example.com/sr' },
    ];
    expect(preferredCaptionTrackUrl(tracks)).toBe('https://example.com/sr');
    expect(preferredCaptionTrackUrl([{ languageCode: 'de', baseUrl: 'https://example.com/de' }])).toBe(
      'https://example.com/de'
    );
    expect(preferredCaptionTrackUrl([])).toBeNull();
  });

  it('strips timedtext XML tags', () => {
    const xml = '<transcript><text start="0">Dodaj </text><text>krompir</text></transcript>';
    expect(timedTextToPlain(xml)).toBe('Dodaj krompir');
  });

  it('reads Instagram og tags and treats a login wall as empty', () => {
    const html = `<html><head>
      <meta property="og:title" content="Reels" />
      <meta property="og:description" content="2 jaja, 200 g brasna" />
    </head></html>`;
    expect(instagramMetaFromHtml(html).description).toBe('2 jaja, 200 g brasna');
    expect(instagramMetaFromHtml('<html>Log in</html>').description).toBe('');
  });

  it('ignores video and audio content types and media paths', () => {
    expect(isMediaContentType('video/mp4')).toBe(true);
    expect(isMediaContentType('text/html')).toBe(false);
    expect(isMediaPath('https://cdn.example.com/clip.mp4')).toBe(true);
    expect(isMediaPath('https://www.tiktok.com/oembed')).toBe(false);
  });

  it('flags short video material', () => {
    expect(materialIsTooShort('kratko')).toBe(true);
    expect(materialIsTooShort('x'.repeat(40))).toBe(false);
  });
});

describe('pasted text import', () => {
  it('requires 40 trimmed characters', () => {
    expect(pastedTextReady('  ' + 'a'.repeat(39))).toBe(false);
    expect(pastedTextReady('  ' + 'a'.repeat(40) + ' ')).toBe(true);
  });

  it('uses a text source note when there is no URL', () => {
    expect(importSourceNote()).toBe('Uvezeno iz nalepijenog teksta');
    expect(importSourceNote('https://example.com/r')).toBe('Izvor: https://example.com/r');
  });
});
