# Prevod uvoza recepta: hrvatski → srpska ekavica

## Problem

Uvoz iz linka već traži „Jezik: srpski“, ali Groq često prepiše tekst sa stranice. Hrvatski i ijekavski recepti (Coolinarika i slično) upisuju se sa `krumpir`, `mlijeko`, `tjestenina`, `češnjak` umesto srpske ekavice koju ostatak aplikacije već koristi.

## Cilj

Pre `createRecipeWithIngredients`, uvezani recept mora biti na **srpskoj ekavici** (mleko, kuvati, krompir). Druga Groq runda se pokreće **samo** ako prvi prolaz i dalje izgleda hrvatski/ijekavski.

## Van opsega

- Ručni unos recepta.
- Već sačuvani recepti.
- Prevod UI-ja aplikacije.
- Uvek-uključena druga runda.
- Rečnik-samo prevod bez modela.

## Tok

Sve se dešava u postojećoj `import-recipe` edge funkciji. Klijent i dalje šalje `{ url }` i dobija `{ recipe }` spreman za upis.

1. Prvi Groq poziv (`groq/compound-mini` + `visit_website`) izvuče recept, kao danas.
2. System prompt se pojača: izlaz mora biti **srpska ekavica**, ne samo „srpski“, sa kratkim primerima (`krumpir` → `krompir`, `mlijeko` → `mleko`, `kuhati` → `kuvati`, `rajčica` → `paradajz`, `češnjak` → `beli luk`).
3. Server spoji tekstualna polja i proveri listu tragova.
4. Nema pogotka → vrati prvi JSON.
5. Ima pogotka → drugi Groq poziv (`openai/gpt-oss-20b`, `response_format: json_object`) prepiše samo tekst na ekavicu.
6. Odgovor klijentu. `app/recipes/import.tsx` i `importFromUrl.ts` se ne menjaju.

## Polja

Drugi poziv sme da menja samo ljudski tekst:

- `name`, `description`, `category`, `notes`
- `steps[]`
- `ingredients[].rawName`, `ingredients[].notes`
- `ingredients[].unit` samo ako je nova vrednost u `ALLOWED_UNITS` (npr. `žlica` → `kašika`)

Ne sme da menja: `quantity`, `baseServings`, `prepTimeMinutes`, `emoji`, strukturu JSON-a.

## Detektor

Čista funkcija `recipeLooksCroatian(recipe)` u `supabase/functions/import-recipe/` (bez Deno API-ja). Jest je uvozi iz istog fajla.

Ulaz: spojeni `name`, `description`, `category`, `notes`, koraci i `rawName`/`notes` sastojaka, lowercased.

Pogodak ako tekst sadrži bilo koji marker kao celu reč (granica reči, ne podstring). Lista:

- `krumpir`, `krumpira`, `krumpire`
- `tjestenina`, `tjestenine`
- `mlijeko`, `mlijeka`
- `češnjak`, `češnjaka`, `cesnjak`
- `rajčica`, `rajčice`
- `juha`, `juhe`
- `vrhnje`, `vrhnja`
- `žlica`, `žlice`, `žličica`
- `šalica`, `šalice`
- `pećnica`, `pećnici`
- `kuhati`, `kuhanje`, `kuhajte`, `kuhamo`, `kuhan`
- `tijesto`, `tijesta`
- `svježi`, `svježe`, `svježa`
- `mljeveno`, `mljevena`, `mljeveni`
- `prije`
- `gdje`
- `cvjetača`
- `pirjati`, `pirjajte`
- `smjesa`, `smjese`
- `bjelanjak`
- `žumanjak`

Prazan tekst → `false`. Srpska ekavica bez ovih reči → `false`. Jedan pogodak → `true` (druga runda).

## Spajanje prevoda

`mergeTranslatedRecipe(original, translated)`:

1. Ako `translated` nema neprazan `name` — vrati `original` u celosti.
2. Inače kreni od originala i prepiši tekst samo gde je prevedena vrednost neprazan string (prazan string ne briše original).
3. `steps`: koristi prevedeni niz ako ima bar jedan neprazan korak; inače original.
4. Sastojci: ako niz nije iste dužine kao original, zadrži originalne sastojke (naziv/koraci mogu ostati prevedeni). Ako jeste, `rawName` i `notes` iz prevoda samo ako su neprazni; `quantity` uvek iz originala; `unit` iz prevoda samo ako je u `ALLOWED_UNITS`.
5. `emoji`, `baseServings`, `prepTimeMinutes` uvek iz originala.

## Greške

Druga runda ne sme da sruši uvoz. Ako Groq vrati grešku, prazan odgovor, ne-JSON, ili `mergeTranslatedRecipe` odbaci rezultat — klijent dobija **prvi** recept. Korisnik može da ispravi preko Uredi.

Lažni pogodak detektora = suvišan poziv; ekavica ostaje ekavica. Promašaj detektora = ostaje prvi prolaz; zato prvi prompt i dalje traži ekavicu.

## Testovi

Bez Groq poziva u CI.

- Hrvatski uzorak (`krumpir`, `mlijeko`, `rajčica`) → `true`
- Srpska ekavica (`krompir`, `mleko`, `kuvati`) → `false`
- Prazan recept → `false`
- Prevod bez `name` → ceo original
- Prevod samo `name` → ostala polja iz originala
- Različita dužina `ingredients` → originalni sastojci, ostali prevedeni tekst ostaje

## Pogođene datoteke

- `supabase/functions/import-recipe/index.ts` — jači prompt, detekcija, druga runda, merge.
- Novi moduli pored funkcije za detektor i merge (Jest ih uvozi).
- `src/features/recipes/__tests__/…` — testovi detektora i merge-a.
- Klijent se ne dira.
