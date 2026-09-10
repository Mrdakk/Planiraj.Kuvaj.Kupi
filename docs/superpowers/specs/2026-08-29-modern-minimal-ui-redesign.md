# Modern Minimal UI Redesign

## Scope

Celokupan redizajn korisničkog interfejsa aplikacije u "Modern Minimal" (Apple-style) smeru. Obuhvata:

- Globalni sistem dizajna (boje, tipografija, senke, zaobljenja).
- Donju navigaciju (tab bar) — zamena slova ikonicama.
- Planiraj ekran (`app/(tabs)/index.tsx`) — kompaktan raspored bez istanjenih stubaca.
- Pomoćne UI komponente koje treba prilagoditi novom stilu.

## Ciljevi

- Ukloniti "rastegnut" izgled ekrana sa visokim stubcima.
- Učiniti navigaciju jasnom kroz ikonice.
- Poboljšati hijerarhiju informacija i čitljivost.
- Zadržati prepoznatljivu narandžastu akcent-boju, ali primenjivati je merljivo.

## Dizajn odluke

### Boje

- Pozadina: `#FFFFFF` (čista bela) ili `#FAFAF9` (vrlo svetla topla siva).
- Površina: `#FFFFFF`.
- Tekst primarni: `#1C1917` (stone-900).
- Tekst sekundarni: `#78716C` (stone-500).
- Tekst muted: `#A8A29E` (stone-400).
- Akcent: `#F97316` (narandžasta).
- Akcent tamni: `#EA580C`.
- Border: `#E7E5E4` (stone-200).
- Senke: mekše, sa nižom opacitetom (`rgba(0,0,0,0.06)`).

### Tipografija

- `h1`: 32px, weight 700.
- `h2`: 24px, weight 700.
- `h3`: 18px, weight 600.
- `body`: 16px, weight 400.
- `bodySmall`: 14px, weight 400.
- `caption`: 12px, weight 500.

### Komponente

- **Card**: bela pozadina, borderRadius 16px, blaga senka, padding 16px.
- **Button**: solid narandžasti, beli tekst, borderRadius 12px, weight 600.
- **Chip**: siva pozadina (`#F5F5F4`), borderRadius full, aktivni = narandžasti sa belim tekstom.
- **EmptyState**: centralno poravnata ikonica, bold naslov i CTA dugme.

### Donja navigacija

Tab bar koristi ikonice umesto jednog slova:

- Planiraj: `calendar` (Ionicons).
- Kuhinja: `restaurant` ili `fast-food` (Ionicons).
- Fali: `alert-circle` (Ionicons).
- Kupovina: `cart` (Ionicons).
- Više: `ellipsis-horizontal` (Ionicons).

Aktivni tab je narandžasti, neaktivni sivi (`textMuted`). Ispod ikonice ostaje label.

### Planiraj ekran

1. **Header**: naslov "Planiraj" levo, ikonica `+` (plus) desno umesto dugmeta sa tekstom.
2. **Nedeljni izbor**: strelice `‹ ›` oko centralnog datuma, čistije poravnate.
3. **Filteri**: horizontalni chips za tip obroka (Doručak, Ručak, Večera, Užina) — kompaktniji, zaobljeni.
4. **Lista obroka**: vertikalna lista dnevnih kartica. Svaka kartica prikazuje:
   - Datum (bold).
   - Obroke za taj dan grupisane po tipu, svaki kao red:
     - Tip obroka (caption, narandžasto).
     - Naziv recepta (body).
     - Broj porcija (bodySmall, muted).
5. **Prazan stanje**: centralna ikonica, bold tekst "Tvoj plan je prazan" i CTA dugme "Dodaj obrok".

## Pogođene datoteke

- `src/constants/theme.ts` — ažurirane boje, tipografija, senke, zaobljenja.
- `app/(tabs)/_layout.tsx` — zamena slova ikonicama, podešavanje tab bar stila.
- `app/(tabs)/index.tsx` — redizajniran Planiraj ekran.
- `src/components/ui/Card.tsx` (ako postoji) — prilagoditi senke i zaobljenja.
- `src/components/ui/Button.tsx` (ako postoji) — prilagoditi stil.
- `src/components/ui/EmptyState.tsx` (ako postoji) — prilagoditi stil.
- `package.json` — dodati `@expo/vector-icons` ako nije instaliran.

## Ne cilja na

- Promenu funkcionalnosti ili biznis logike.
- Promenu modela podataka ili API poziva.
- Dodavanje novih ekrana ili feature-a.

## Kriterijum završetka

- Planiraj ekran izgleda kompaktno, bez rastegnutih stubaca.
- Donja navigacija prikazuje ikonice umesto slova.
- Boje i tipografija su dosledne širom aplikacije.
- Aplikacija se učitava bez grešaka nakon redizajna.
