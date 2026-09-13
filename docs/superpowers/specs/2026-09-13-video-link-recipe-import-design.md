# Uvoz recepta: video link i sirovi tekst

## Problem

Korisnik hoće da na postojećem uvozu:

1. Nalepi TikTok / Instagram Reels / YouTube Shorts link i da Groq sastavi recept iz **javnog teksta** (opis, titlovi) — bez skidanja videa.
2. Nalepi **neformatiran tekst** recepta (poruka, beleška, copy-paste) i da Groq od toga napravi isti strukturirani pregled.

Današnji uvoz čita samo URL → HTML (JSON-LD / tekst / `visit_website`). Video stranice skoro nikad nemaju Recipe šemu. Sirovi tekst uopšte nema ulaz.

## Cilj

Jedan ekran, jedan pregled, jedno čuvanje. Edge funkcija `import-recipe` prima **ili** `{ url }` **ili** `{ text }` i vraća `{ recipe }` u postojećoj JSON šemi. Nema izmišljenih sastojaka. Kuhinja se menja tek na Sačuvaj.

## Van opsega

- Skidanje video/audio bajtova (`yt-dlp`, `.mp4`, HLS, worker, ffmpeg).
- Whisper, OCR, čitanje overlay-a sa kadrova.
- Share iz TikTok/Instagram/YouTube aplikacije.
- Poseban ekran samo za video ili samo za tekst.
- Uvoz iz teksta na **Novi recept** formi.
- Meta/Facebook app token za Instagram oEmbed.
- Privatni, login-only ili region-locked snimci.
- Ručni unos recepta polje-po-polje i već sačuvani recepti.
- Nova ekavica runda (ako page-import već ima drugi prolaz, obe grane idu kroz njega; ovaj zadatak je ne dodaje).

## Tok

### Klijent

Ekran `app/recipes/import.tsx`, naslov **Uvoz recepta** (i u `app/_layout.tsx`).

`ChipRow`: `Link` | `Tekst`, uvek tačno jedan izabran (`allowDeselect={false}`), podrazumevano `Link`. Prebacivanje čipa ne briše drugi unos, ali šalje se samo aktivni.

- **Link:** postojeće URL polje. Help: nalepi blog, Coolinariku, ili javni TikTok / Reels / Shorts. Radi kad su sastojci na stranici, u opisu ili u titlovima. Placeholder: Coolinarika + primer TikTok URL-a.
- **Tekst:** multiline `Input` (`multiline`, visina ~160). Help: nalepi sirovi recept (sastojci i koraci kako god stoje). Pregled pa čuvanje. Placeholder npr. `Musaka\n500 g mesa\n4 krompira\n…`.
- Dugme **Učitaj recept** kao danas. Disabled dok je Link prazan, ili dok je Tekst kraći od 40 znakova (trim), ili `loading`.
- Uspeh → isti preview (Uredi / Pregled, Sačuvaj). Otkaži vraća na aktivni čip, ne na prazan ekran.

Pozivi:

- Link → `importRecipeFromUrl(url)` → `{ url }`
- Tekst → `importRecipeFromText(text)` u istom modulu `importFromUrl.ts` → `{ text }`
- Nikad oba polja u body.

`mapRecipe`: `sourceUrl` opciono. Notes:

- URL uvoz: `Izvor: {url}` kao danas.
- Tekst uvoz: `Uvezeno iz nalepijenog teksta` (dodaje se isto kao izvor, ne prepisuje Groq `notes` ako postoje).

### Server

Redosled u `Deno.serve` posle emoji batch-eva (`ingredientNames` / `names` nepromenjeni):

1. Ako `body.url` i `body.text` oba neprazna → `400` `Pošalji ili url ili text, ne oba.`
2. Ako `text` (string, trim) neprazan → `handleImportText`.
3. Inače postojeći URL tok (`handleImportUrl` sa video granom).
4. Ako ništa → postojeća 400 (link ili lista naziva) — dopuniti: `… ili text.`

`handleImportText`:

1. Trim. Kraće od 40 znakova → `422` poruka ispod.
2. `groqParseMaterial` na `text.slice(0, 14000)` sa istim `PARSE_SYSTEM_PROMPT`. User poruka: izvuci recept iz nalepijenog teksta; ne otvaraj URL; ne izmišljaj sastojke; ako nema recepta vrati `{"error":"Nije pronađen recept na stranici."}`.
3. `isCompleteRecipe` / `recipeFromGroq` kao danas. Fail → `422`.
4. Ekavica drugi prolaz samo ako već postoji za page-import.

`handleImportUrl` (video, bez skidanja):

1. Ako `isVideoImportUrl(url)` — video-tekst grana, **nemoj** `fetchRecipePage`.
2. Inače postojeći tok (JSON-LD / plain text / `visit_website`).
3. Video: `collectVideoText(url)` → naslov + opis + transkript.
4. Spojeni tekst < 40 znakova ili prazni svi delovi → `422`.
5. Inače `groqParseMaterial` + ista šema.
6. Uspeh → `{ recipe }`.

## Klasifikacija URL-a

`isVideoImportUrl` je čista funkcija (Jest). `true` samo za http(s) hostove:

| Platforma | Host / putanja |
| --- | --- |
| TikTok | `tiktok.com`, `www.tiktok.com`, `vm.tiktok.com`, `vt.tiktok.com`, `m.tiktok.com` |
| Instagram | `instagram.com` / `www.instagram.com` čiji pathname sadrži `/reel/`, `/reels/` ili `/p/` |
| YouTube | `youtube.com` / `www.youtube.com` / `m.youtube.com` sa `/shorts/` ili `/watch`; `youtu.be` |

Sve ostalo (Coolinarika, blogovi, nepoznati host) ostaje page-import. Instagram profili, `/stories/`, YouTube kanali nisu video uvoz.

Čip **Tekst** nikad ne tretira sadržaj kao URL, čak i ako tekst počinje sa `https://`.

## Skupljanje javnog teksta (samo Link + video URL)

Zajednička pravila za svaki HTTP poziv u ovoj grani:

- Samo `http:` / `https:`.
- `redirect: follow`, ali odredište i dalje mora biti http(s).
- Ako `Content-Type` počinje sa `video/` ili `audio/` → prekini taj poziv, ne čitaj body.
- Ne zahtevaj URL čija putanja izgleda kao medija (`.mp4`, `.webm`, `.m3u8`, `.mp3`, `.m4a`).
- Timeout 15s po fetch-u. User-Agent kao u postojećem `fetchRecipePage`.

### TikTok

`GET https://www.tiktok.com/oembed?url={encodeURIComponent(url)}`

Iz JSON-a: `title`, plus caption iz `html` (tekst unutar `<p>…</p>` embed-a, bez tagova). Zvaničan oEmbed, ne video fajl.

Ako oEmbed nije 200 ili nema teksta — nema fallback-a na CDN.

### YouTube

1. Izvuci video id (`watch?v=`, `/shorts/{id}`, `youtu.be/{id}`).
2. `GET https://www.youtube.com/oembed?url=…&format=json` → `title` (`author_name` samo kontekst u materijalu, ne sastojak).
3. Transkript **bez videa**: fetch HTML watch/shorts stranice, iz `ytInitialPlayerResponse` pročitaj `captionTracks`. Preferiraj `sr` / `sr-Latn` / `hr` / `bs` pa `en`, pa prvu. Fetch **timedtext** URL-a, pretvori u običan tekst.
4. Bez captionTracks — ostaje oEmbed naslov (često nije recept).

Ne koristiti `googlevideo.com` niti adaptive streaming URL-ove.

### Instagram

Bez Meta app tokena. `GET` permalink HTML. Samo `og:title`, `og:description`, `meta name="description"`. Login zid / prazni meta → `422`. Ne pratiti `og:video` / `video_url`.

## Materijal za Groq (video URL)

```
Izvuci recept iz javnog teksta ovog videa ({url}).
Ne otvaraj URL. Ne izmišljaj sastojke koji nisu u tekstu.
Ako nema recepta, vrati {"error":"Nije pronađen recept na stranici."}

Naslov: …
Opis: …
Transkript: …   (izostavi blok ako je prazan)
```

## Greške (klijent vidi `error` string)

| Situacija | Poruka |
| --- | --- |
| Nije http(s) (Link) | postojeća: unesi ispravan link |
| I url i text | `Pošalji ili url ili text, ne oba.` |
| Tekst kraći od 40 znakova | `Nalepi duži tekst recepta (bar sastojke).` |
| Video URL, nema javnog teksta | `Na tom videu nema javnog opisa ni titlova. Probaj drugi link, nalepi tekst, ili unesi recept ručno.` |
| Video tekst postoji, parser ne nađe recept | `Nije mogao da se pročita recept sa tog videa. Treba opis ili titlovi sa sastojcima, nalepi tekst, ili unesi recept ručno.` |
| Nalepijen tekst, parser ne nađe recept | `Nije mogao da se pročita recept iz tog teksta. Dopuni sastojke ili unesi recept ručno.` |
| Groq 429 | postojeća dnevni limit poruka |
| Ostali Groq/server fail | postojeće 502 poruke |

Ne vraćati polovičan recept (samo naslov, 0 sastojaka). `isCompleteRecipe` ostaje filter.

## Testovi

Bez živih mrežnih poziva ka TikTok/Instagram/YouTube u CI. Bez Groq poziva. Fixture JSON/HTML/XML.

Video / URL:

- Klasifikacija: tiktok, `vm.tiktok.com`, ig `/reel/` i `/p/`, yt `/shorts/`, `/watch`, `youtu.be` → video; Coolinarika i `instagram.com/korisnik` → nije video.
- TikTok oEmbed fixture → `title` + `<p>` caption.
- YouTube id iz sva tri oblika linka.
- `captionTracks` sa `sr` → transkript; bez traka → samo naslov.
- Timedtext XML → plain text.
- Instagram HTML sa `og:description` → opis; login zid → prazan tekst.
- `Content-Type: video/mp4` → izvor se ignoriše.
- Spojeni video materijal < 40 znakova → „nema javnog teksta“.

Tekst:

- Trim + dužina: 39 → prekratak; 40 → prolazi proveru (čista funkcija, bez HTTP).
- `mapRecipe` bez `sourceUrl` → notes sadrže `Uvezeno iz nalepijenog teksta`, ne `Izvor:`.
- Server i dalje seče materijal na 14000 znakova u postojećem `groqParseMaterial`; novi test za to nije potreban.

Postojeći `parseRecipePage` testovi ostaju netaknuti.

## Pogođene datoteke

- `supabase/functions/import-recipe/index.ts` — `text` grana; video grana pre `fetchRecipePage`.
- Novi čisti moduli: `videoUrl.ts`, `videoText.ts` (Jest iz `src/features/recipes/__tests__/`).
- `app/recipes/import.tsx` — čipovi, textarea, copy, naslov.
- `app/_layout.tsx` — naslov stack ekrana.
- `src/features/recipes/importFromUrl.ts` — `importRecipeFromText`, opciono `sourceUrl`, notes za tekst.
- Testovi u `src/features/recipes/__tests__/`.
- Ikona `link-outline` na listi recepata ostaje (ulaz je i dalje uvoz).
