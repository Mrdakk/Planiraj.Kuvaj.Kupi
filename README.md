# Planiraj.Kuvaj.Kupi (PKK)

Mobilna aplikacija za planiranje obroka, upravljanje zalihama i generisanje liste za kupovinu. Aplikacija radi offline-first, sa sinhronizacijom putem Supabase-a.

## Tagline

**Pametnije planiranje. Manje razmišljanja.**

## Glavni tok

1. Planiraj obroke za nedelju.
2. Aplikacija izračuna šta fali na osnovu recepata i zaliha.
3. Generiši listu za kupovinu.
4. Označi obrok kao kuvano i automatski smanji zalihe.

## Tech stack

- React Native + Expo + TypeScript + Expo Router
- SQLite (Expo SQLite) za lokalne podatke
- Supabase (PostgreSQL, Auth, Storage)
- TanStack Query, Zustand, Zod, React Hook Form
- Jest + ts-jest za testove

## Pokretanje

```bash
npm install
npm start
```

Za testove:

```bash
npm test
```

## Podešavanje Supabase-a

Projekat već koristi novi Supabase projekat. Lokalne promenljive se čuvaju u `.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=https://kvrwwtznrxqgtvqodjdp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

## Arhitektura

- `src/app/` — Expo Router ekrani
- `src/components/` — deljene UI komponente
- `src/features/` — planner, recipes, pantry, missing, shopping, cooking
- `src/services/repositories/` — SQLite repozitorijumi
- `src/database/` — SQLite schema i migracije
- `src/sync/` — sync engine, queue, conflict resolver
- `src/calculations/` — deterministički calculation engine
- `src/validation/` — Zod seme
- `src/hooks/` — TanStack Query hooks
- `src/store/` — Zustand store
## Calculation engine

Najvažniji deo sistema. Testovi pokrivaju sve ključne scenarije:

- agregacija istog sastojka iz više recepata
- skaliranje porcija
- konverzija jedinica (g/kg, ml/l)
- oduzimanje zaliha
- ponovno računanje kada se plan promeni
- offline-first deterministički izlaz

Pokreni testove sa `npm test`.

## Važni principi

- Kupovina != automatsko dodavanje u kuhinju.
- Kuvanje smanjuje zalihe tek nakon potvrde.
- Nema lokacija u kuhinji (samo jedinstven spisak namirnica).
- Sve poslovne logike su izvan UI komponenti.
