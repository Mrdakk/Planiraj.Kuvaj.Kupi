import { nowISO } from '@/database/repository';
import {
  recipeRepository,
  recipeIngredientRepository,
  ingredientRepository,
  ingredientAliasRepository,
  pantryItemRepository,
  mealRepository,
} from '@/services/repositories';
import {
  createRecipeWithIngredients,
  updateRecipeWithIngredients,
  type CreateRecipeInput,
} from '@/features/recipes/service';
import { addPantryItem } from '@/features/pantry/service';
import { ensureKitchenItemsFromRecipes } from '@/features/pantry/ensure';
import { ensureAlias, linkIngredients } from '@/features/ingredients/link';
import { addMeal, addDays, ensureMealPlan, getSeedPlanWeekStarts } from '@/features/planner/service';
import { generateUUID } from '@/lib/uuid';
import { todayISO } from '@/lib/dates';
import { canonicalIngredientName, ingredientNameKey } from '@/lib/ingredientNames';
import type { IngredientCategory, MealType } from '@/constants/categories';
import type { Unit } from '@/constants/units';

interface SeedIngredient {
  name: string;
  category: IngredientCategory;
  defaultUnit: Unit;
  emoji?: string;
}

interface SeedPantryItem {
  rawName: string;
  quantity: number;
  unit: Unit;
  expiresInDays?: number;
}

interface SeedMeal {
  dayOffset: number;
  mealType: MealType;
  recipeName: string;
  servings: number;
}

const seedIngredients: SeedIngredient[] = [
  { name: 'Crni luk', category: 'Povrće', defaultUnit: 'glavica', emoji: '🧅' },
  { name: 'Beli luk', category: 'Povrće', defaultUnit: 'čen', emoji: '🧄' },
  { name: 'Krompir', category: 'Povrće', defaultUnit: 'kg', emoji: '🥔' },
  { name: 'Paradajz', category: 'Povrće', defaultUnit: 'kom', emoji: '🍅' },
  { name: 'Paprika', category: 'Povrće', defaultUnit: 'kom', emoji: '🫑' },
  { name: 'Pečurke', category: 'Povrće', defaultUnit: 'g', emoji: '🍄' },
  { name: 'Šargarepa', category: 'Povrće', defaultUnit: 'kom', emoji: '🥕' },
  { name: 'Krastavac', category: 'Povrće', defaultUnit: 'kom', emoji: '🥒' },
  { name: 'Zelena salata', category: 'Povrće', defaultUnit: 'kom', emoji: '🥬' },
  { name: 'Peršun', category: 'Povrće', defaultUnit: 'kašika', emoji: '🌿' },
  { name: 'Brokoli', category: 'Povrće', defaultUnit: 'g', emoji: '🥦' },
  { name: 'Tikvice', category: 'Povrće', defaultUnit: 'kom', emoji: '🥒' },
  { name: 'Pasulj', category: 'Povrće', defaultUnit: 'g', emoji: '🫘' },
  { name: 'Kukuruz', category: 'Povrće', defaultUnit: 'konzerva', emoji: '🌽' },
  { name: 'Grašak', category: 'Povrće', defaultUnit: 'g', emoji: '🟢' },
  { name: 'Banana', category: 'Voće', defaultUnit: 'kom', emoji: '🍌' },
  { name: 'Jabuka', category: 'Voće', defaultUnit: 'kom', emoji: '🍎' },
  { name: 'Limun', category: 'Voće', defaultUnit: 'kom', emoji: '🍋' },
  { name: 'Jagode', category: 'Voće', defaultUnit: 'g', emoji: '🍓' },
  { name: 'Borovnice', category: 'Voće', defaultUnit: 'g', emoji: '🫐' },
  { name: 'Mleveno meso', category: 'Meso', defaultUnit: 'g', emoji: '🥩' },
  { name: 'Dimljena slanina', category: 'Meso', defaultUnit: 'g', emoji: '🥓' },
  { name: 'Piletina', category: 'Meso', defaultUnit: 'g', emoji: '🍗' },
  { name: 'Šunka', category: 'Meso', defaultUnit: 'g', emoji: '🍖' },
  { name: 'Tuna', category: 'Meso', defaultUnit: 'konzerva', emoji: '🐟' },
  { name: 'Jaja', category: 'Mlečni proizvodi', defaultUnit: 'kom', emoji: '🥚' },
  { name: 'Mleko', category: 'Mlečni proizvodi', defaultUnit: 'ml', emoji: '🥛' },
  { name: 'Pavlaka', category: 'Mlečni proizvodi', defaultUnit: 'ml', emoji: '🥛' },
  { name: 'Kačkavalj', category: 'Mlečni proizvodi', defaultUnit: 'g', emoji: '🧀' },
  { name: 'Jogurt', category: 'Mlečni proizvodi', defaultUnit: 'ml', emoji: '🥛' },
  { name: 'Puter', category: 'Mlečni proizvodi', defaultUnit: 'g', emoji: '🧈' },
  { name: 'Feta', category: 'Mlečni proizvodi', defaultUnit: 'g', emoji: '🧀' },
  { name: 'Špageti', category: 'Testenine i žitarice', defaultUnit: 'pakovanje', emoji: '🍝' },
  { name: 'Pirinač', category: 'Testenine i žitarice', defaultUnit: 'g', emoji: '🍚' },
  { name: 'Ovsene pahuljice', category: 'Testenine i žitarice', defaultUnit: 'g', emoji: '🥣' },
  { name: 'Brašno', category: 'Testenine i žitarice', defaultUnit: 'g', emoji: '🌾' },
  { name: 'Hleb', category: 'Testenine i žitarice', defaultUnit: 'kom', emoji: '🍞' },
  { name: 'Pire od paradajza', category: 'Konzervirano', defaultUnit: 'ml', emoji: '🍅' },
  { name: 'So', category: 'Začini', defaultUnit: 'kašičica', emoji: '🧂' },
  { name: 'Biber', category: 'Začini', defaultUnit: 'kašičica', emoji: '🧂' },
  { name: 'Vegeta', category: 'Začini', defaultUnit: 'kašičica', emoji: '🧂' },
  { name: 'Kumin', category: 'Začini', defaultUnit: 'kašičica', emoji: '🌿' },
  { name: 'Origano', category: 'Začini', defaultUnit: 'kašičica', emoji: '🌿' },
  { name: 'Lovorov list', category: 'Začini', defaultUnit: 'kom', emoji: '🍃' },
  { name: 'Ljuta aleva paprika', category: 'Začini', defaultUnit: 'kašičica', emoji: '🌶️' },
  { name: 'Slatka aleva paprika', category: 'Začini', defaultUnit: 'kašičica', emoji: '🌶️' },
  { name: 'Kurkuma u prahu', category: 'Začini', defaultUnit: 'kašičica', emoji: '🟡' },
  { name: 'Goveđa kocka', category: 'Začini', defaultUnit: 'kom', emoji: '🧊' },
  { name: 'Suvi bosiljak', category: 'Začini', defaultUnit: 'kašičica', emoji: '🌿' },
  { name: 'Med', category: 'Ostalo', defaultUnit: 'kašika', emoji: '🍯' },
  { name: 'Šećer', category: 'Ostalo', defaultUnit: 'g', emoji: '🍬' },
  { name: 'Ulje', category: 'Ostalo', defaultUnit: 'kašika', emoji: '🫙' },
  { name: 'Maslinovo ulje', category: 'Ostalo', defaultUnit: 'kašika', emoji: '🫒' },
  { name: 'Voda', category: 'Ostalo', defaultUnit: 'ml', emoji: '💧' },
];

const pantryStaples: SeedPantryItem[] = [
  { rawName: 'Crni luk', quantity: 6, unit: 'glavica' },
  { rawName: 'Beli luk', quantity: 10, unit: 'čen' },
  { rawName: 'Krompir', quantity: 2, unit: 'kg' },
  { rawName: 'Paradajz', quantity: 8, unit: 'kom', expiresInDays: 4 },
  { rawName: 'Paprika', quantity: 6, unit: 'kom', expiresInDays: 6 },
  { rawName: 'Pečurke', quantity: 400, unit: 'g', expiresInDays: 3 },
  { rawName: 'Šargarepa', quantity: 8, unit: 'kom' },
  { rawName: 'Krastavac', quantity: 3, unit: 'kom', expiresInDays: 5 },
  { rawName: 'Zelena salata', quantity: 2, unit: 'kom', expiresInDays: 2 },
  { rawName: 'Tikvice', quantity: 3, unit: 'kom' },
  { rawName: 'Pasulj', quantity: 500, unit: 'g' },
  { rawName: 'Grašak', quantity: 400, unit: 'g' },
  { rawName: 'Jaja', quantity: 12, unit: 'kom', expiresInDays: 12 },
  { rawName: 'Mleko', quantity: 1, unit: 'l', expiresInDays: 3 },
  { rawName: 'Jogurt', quantity: 500, unit: 'ml', expiresInDays: 7 },
  { rawName: 'Puter', quantity: 250, unit: 'g', expiresInDays: 20 },
  { rawName: 'Kačkavalj', quantity: 400, unit: 'g', expiresInDays: 14 },
  { rawName: 'Pavlaka', quantity: 200, unit: 'ml', expiresInDays: 5 },
  { rawName: 'Feta', quantity: 200, unit: 'g', expiresInDays: 10 },
  { rawName: 'Mleveno meso', quantity: 500, unit: 'g', expiresInDays: 2 },
  { rawName: 'Piletina', quantity: 800, unit: 'g', expiresInDays: 2 },
  { rawName: 'Šunka', quantity: 250, unit: 'g', expiresInDays: 6 },
  { rawName: 'Dimljena slanina', quantity: 300, unit: 'g' },
  { rawName: 'Tuna', quantity: 2, unit: 'konzerva' },
  { rawName: 'Banana', quantity: 6, unit: 'kom', expiresInDays: 4 },
  { rawName: 'Jabuka', quantity: 5, unit: 'kom' },
  { rawName: 'Limun', quantity: 4, unit: 'kom' },
  { rawName: 'Jagode', quantity: 250, unit: 'g', expiresInDays: 2 },
  { rawName: 'Borovnice', quantity: 150, unit: 'g', expiresInDays: 5 },
  { rawName: 'Ulje', quantity: 1, unit: 'l' },
  { rawName: 'Maslinovo ulje', quantity: 500, unit: 'ml' },
  { rawName: 'So', quantity: 500, unit: 'g' },
  { rawName: 'Biber', quantity: 50, unit: 'g' },
  { rawName: 'Vegeta', quantity: 250, unit: 'g' },
  { rawName: 'Origano', quantity: 20, unit: 'g' },
  { rawName: 'Slatka aleva paprika', quantity: 40, unit: 'g' },
  { rawName: 'Brašno', quantity: 1, unit: 'kg' },
  { rawName: 'Pirinač', quantity: 500, unit: 'g' },
  { rawName: 'Špageti', quantity: 2, unit: 'pakovanje' },
  { rawName: 'Ovsene pahuljice', quantity: 400, unit: 'g' },
  { rawName: 'Hleb', quantity: 1, unit: 'kom', expiresInDays: 2 },
  { rawName: 'Pire od paradajza', quantity: 400, unit: 'ml' },
  { rawName: 'Kukuruz', quantity: 1, unit: 'konzerva' },
  { rawName: 'Med', quantity: 250, unit: 'g' },
  { rawName: 'Šećer', quantity: 1, unit: 'kg' },
];

const pasuljRecipe: CreateRecipeInput = {
  name: 'Čorbast pasulj sa dimljenom slaninom',
  description:
    'Klasičan čorbast pasulj sa dimljenom slaninom, lukom i zaprškom. Recept sa Coolinarike (gordanadanilov).',
  baseServings: 6,
  prepTimeMinutes: 60,
  category: 'Glavno jelo',
  emoji: '🍲',
  notes:
    'Pasulj namočiti preko noći. Izvor: https://www.coolinarika.com/recept/corbast-pasulj-sa-dimljenom-slaninom-516fea1e-6386-11eb-b3d9-0242ac120046',
  steps: [
    'Dobro opran pasulj naliti hladnom vodom, vodeći računa o količini vode jer ne bi trebalo da ostane bez nje kada nabubri preko noći.',
    'Sutradan prosuti vodu, naliti svežu i kuvati pasulj 10–15 minuta, pa i nju prosuti. Po želji ponoviti još jednom.',
    'U tiganju propržiti slaninu i luk, pa dodati u pasulj kada provri. Kuvati bez mešanja da se zrna ne bi raspala. Nakon 25–30 minuta dodati mesne kocke, pire od paradajza i pripremiti zapršku.',
    'Na dve–tri kašike ulja propržiti brašno, dodati beli luk i alevu papriku i zapržiti jelo.',
    'Kuvati još 10 minuta. Pred kraj umešati kašičicu kurkume u prahu i posuti malo suvog bosiljka ili majčine dušice. Poslužiti uz sezonsku salatu.',
  ],
  ingredients: [
    { rawName: 'Pasulj', quantity: 500, unit: 'g', notes: 'po izboru' },
    { rawName: 'Dimljena slanina', quantity: 400, unit: 'g', notes: 'isečena na kocke' },
    { rawName: 'Crni luk', quantity: 2, unit: 'glavica', notes: 'sitno iseckan' },
    { rawName: 'Beli luk', quantity: 3, unit: 'čen' },
    { rawName: 'Brašno', quantity: 2, unit: 'kašika' },
    { rawName: 'Ljuta aleva paprika', quantity: 0.5, unit: 'kašičica' },
    { rawName: 'Slatka aleva paprika', quantity: 0.5, unit: 'kašičica' },
    { rawName: 'Kurkuma u prahu', quantity: 0.5, unit: 'kašičica' },
    { rawName: 'Goveđa kocka', quantity: 3, unit: 'kom', notes: '2–3 po ukusu' },
    { rawName: 'Pire od paradajza', quantity: 1, unit: 'kašika', notes: 'puna kašika' },
    { rawName: 'Maslinovo ulje', quantity: 3, unit: 'kašika' },
    { rawName: 'Suvi bosiljak', quantity: 1, unit: 'kašičica', notes: 'ili majčina dušica' },
  ],
};

const musakaRecipe: CreateRecipeInput = {
  name: 'Musaka krompir–meso',
  description:
    'Musaka sa krompirom i mlevenim mesom. Recept sa Coolinarike (MajdaH).',
  baseServings: 6,
  prepTimeMinutes: 70,
  category: 'Glavno jelo',
  emoji: '🥘',
  notes:
    'Poslužiti uz zelenu salatu. Izvor: https://www.coolinarika.com/recept/musaka-krompir-meso-9057261e-6388-11eb-94d8-0242ac120036',
  steps: [
    'Luk očistiti, sitno iseckati i izdinstati. Dodati mleveno meso i začine te dinstati neko vreme.',
    'Krompir očistiti, izrezati na kolutove i oprati. Posoliti i preliti uljem, pa lagano promešati.',
    'Tepsiju premazati uljem. Složiti sloj krompira, popuniti šupljine, pa staviti meso. Preko mesa ponovo složiti krompir. Ako je tepsija manja, slaži red krompira, red mesa, dok sve ne utrošiš. Preliti sa 200 ml tople vode. Peći u zagrejanoj rerni na 220 °C oko 40 minuta.',
    'Pred kraj pečenja musaku preliti smesom jaja, mleka i pavlake, vratiti u rernu i zapeći.',
    'Pečenu musaku ostaviti da se prohladi, jer se tako bolje seče. Poslužiti uz zelenu salatu.',
  ],
  ingredients: [
    { rawName: 'Mleveno meso', quantity: 500, unit: 'g' },
    { rawName: 'Crni luk', quantity: 1, unit: 'glavica', notes: 'sitno iseckan' },
    { rawName: 'Krompir', quantity: 1, unit: 'kg', notes: 'izrezan na kolutove' },
    { rawName: 'So', quantity: 1, unit: 'kašičica', notes: 'po ukusu' },
    { rawName: 'Biber', quantity: 0.5, unit: 'kašičica', notes: 'po ukusu' },
    { rawName: 'Vegeta', quantity: 1, unit: 'kašičica', notes: 'po ukusu' },
    { rawName: 'Kumin', quantity: 0.5, unit: 'kašičica', notes: 'po ukusu' },
    { rawName: 'Peršun', quantity: 1, unit: 'kašika', notes: 'po ukusu' },
    { rawName: 'Ulje', quantity: 3, unit: 'kašika', notes: 'za dinstanje i tepsiju' },
    { rawName: 'Jaja', quantity: 3, unit: 'kom', notes: 'za preliv' },
    { rawName: 'Mleko', quantity: 200, unit: 'ml', notes: '2 dl, za preliv' },
    { rawName: 'Pavlaka', quantity: 100, unit: 'ml', notes: '1 dl, za preliv' },
    { rawName: 'Voda', quantity: 200, unit: 'ml', notes: 'topla, za pečenje' },
  ],
};

const bolonjezeRecipe: CreateRecipeInput = {
  name: 'Bolonjeze špageti',
  description:
    'Špageti bolonjeze po maminom receptu, za ljubitelje italijanske kuhinje. Recept sa Coolinarike (CeceM3).',
  baseServings: 4,
  prepTimeMinutes: 150,
  category: 'Glavno jelo',
  emoji: '🍝',
  notes:
    'Testeninu ne prekuvati. Izvor: https://www.coolinarika.com/recept/bolonjeze-spageti-8e1947ae-63da-11eb-b78b-0242ac12004f',
  steps: [
    'Stavi 2–3 kašike ulja u tiganj i dodaj naseckani crni luk. Posoli (da luk pusti vodu) i dinstaj, pazeći da luk ostane svetli. Uz povremeno dodavanje malo vode dinstaj oko 20 minuta, dok sasvim ne omekša.',
    'Dodaj mleveno meso i začine. Kratko proprži, pa nalij vodom (oko 2 čaše). Poklopi do pola i ostavi na tihoj vatri da kuva oko sat–sat i po. Po potrebi dodaj vodu, ali ne previše.',
    'Na kraju dodaj pire od paradajza, otvori poklopac i uz češće mešanje kuvaj dok voda ne ispari, a ostane dovoljno sosa (još oko 20 minuta).',
    'Skuvaj špagete: u vrelu vodu stavi so i malo ulja, pusti da provri i dodaj špagete. Ne prekuvaj ih (obično oko 5 minuta). Kad su kuvani, procedi i isperi hladnom vodom.',
    'Serviraj špagete, prelij sosom i rendanim kačkavaljem odozgo.',
  ],
  ingredients: [
    { rawName: 'Mleveno meso', quantity: 500, unit: 'g', notes: 'mešano teleće/svinjsko' },
    { rawName: 'Crni luk', quantity: 5, unit: 'glavica', notes: '4–5 glavica' },
    { rawName: 'Ulje', quantity: 3, unit: 'kašika' },
    { rawName: 'So', quantity: 1, unit: 'kašičica', notes: 'po ukusu' },
    { rawName: 'Biber', quantity: 0.5, unit: 'kašičica', notes: 'po ukusu' },
    { rawName: 'Origano', quantity: 1, unit: 'kašičica', notes: 'po ukusu' },
    { rawName: 'Lovorov list', quantity: 2, unit: 'kom' },
    { rawName: 'Pire od paradajza', quantity: 200, unit: 'ml' },
    { rawName: 'Voda', quantity: 500, unit: 'ml', notes: 'oko 2 čaše, za sos' },
    { rawName: 'Špageti', quantity: 1, unit: 'pakovanje', notes: 'tanki, npr. Barilla no. 3' },
    { rawName: 'Kačkavalj', quantity: 80, unit: 'g', notes: 'rendani, za serviranje' },
  ],
};

const extraRecipes: CreateRecipeInput[] = [
  {
    name: 'Omlet sa sirom',
    description: 'Brz doručak od jaja i kačkavalja.',
    baseServings: 2,
    prepTimeMinutes: 15,
    category: 'Doručak',
    emoji: '🍳',
    steps: [
      'Umutiti jaja sa ščepom soli i bibera.',
      'Zagrejati puter u tiganju, sipati jaja i peći na umerenoj vatri.',
      'Posuti rendani kačkavalj, preklopiti omlet i poslužiti toplo.',
    ],
    ingredients: [
      { rawName: 'Jaja', quantity: 3, unit: 'kom' },
      { rawName: 'Kačkavalj', quantity: 60, unit: 'g' },
      { rawName: 'Puter', quantity: 10, unit: 'g' },
      { rawName: 'So', quantity: 1, unit: 'kašičica' },
      { rawName: 'Biber', quantity: 0.25, unit: 'kašičica' },
    ],
  },
  {
    name: 'Palačinke',
    description: 'Tanke palačinke za doručak ili užinu.',
    baseServings: 4,
    prepTimeMinutes: 30,
    category: 'Doručak',
    emoji: '🥞',
    steps: [
      'Umutiti jaja, mleko, brašno i prstohvat soli u glatku smesu.',
      'Peći tanke palačinke na malo ulja, sa obe strane.',
      'Servirati sa medom, voćem ili džemom.',
    ],
    ingredients: [
      { rawName: 'Jaja', quantity: 2, unit: 'kom' },
      { rawName: 'Mleko', quantity: 400, unit: 'ml' },
      { rawName: 'Brašno', quantity: 200, unit: 'g' },
      { rawName: 'Ulje', quantity: 2, unit: 'kašika' },
      { rawName: 'So', quantity: 0.25, unit: 'kašičica' },
      { rawName: 'Med', quantity: 4, unit: 'kašika', notes: 'za serviranje' },
    ],
  },
  {
    name: 'Ovsena kaša sa bananom',
    description: 'Brza kaša sa ovsenim pahuljicama i bananom.',
    baseServings: 2,
    prepTimeMinutes: 10,
    category: 'Doručak',
    emoji: '🥣',
    steps: [
      'Ovsene pahuljice kuvati u mleku 5 minuta, uz mešanje.',
      'Skinuti sa vatre, dodati naseckanu bananu i med.',
      'Poslužiti toplo, po želji sa borovnicama.',
    ],
    ingredients: [
      { rawName: 'Ovsene pahuljice', quantity: 80, unit: 'g' },
      { rawName: 'Mleko', quantity: 300, unit: 'ml' },
      { rawName: 'Banana', quantity: 1, unit: 'kom' },
      { rawName: 'Med', quantity: 1, unit: 'kašika' },
      { rawName: 'Borovnice', quantity: 50, unit: 'g', notes: 'po želji' },
    ],
  },
  {
    name: 'Kajgana sa povrćem',
    description: 'Kajgana sa paprikom, paradajzom i sirom.',
    baseServings: 2,
    prepTimeMinutes: 15,
    category: 'Doručak',
    emoji: '🍳',
    steps: [
      'Na ulju propržiti papriku i paradajz par minuta.',
      'Sipati umućena jaja, mešati dok se ne zgusnu.',
      'Posuti fetu i peršun pa odmah poslužiti.',
    ],
    ingredients: [
      { rawName: 'Jaja', quantity: 4, unit: 'kom' },
      { rawName: 'Paprika', quantity: 1, unit: 'kom' },
      { rawName: 'Paradajz', quantity: 1, unit: 'kom' },
      { rawName: 'Feta', quantity: 50, unit: 'g' },
      { rawName: 'Ulje', quantity: 1, unit: 'kašika' },
      { rawName: 'Peršun', quantity: 1, unit: 'kašika' },
      { rawName: 'So', quantity: 0.5, unit: 'kašičica' },
    ],
  },
  {
    name: 'Piletina sa pirinčem',
    description: 'Piletina iz tiganja uz kuvani pirinač i povrće.',
    baseServings: 4,
    prepTimeMinutes: 40,
    category: 'Glavno jelo',
    emoji: '🍗',
    steps: [
      'Piletinu iseći na kocke, začiniti solju i biberom.',
      'Propržiti na ulju, dodati crni luk, šargarepu i beli luk.',
      'Skuvati pirinač posebno i poslužiti uz piletinu.',
    ],
    ingredients: [
      { rawName: 'Piletina', quantity: 600, unit: 'g' },
      { rawName: 'Pirinač', quantity: 300, unit: 'g' },
      { rawName: 'Crni luk', quantity: 1, unit: 'glavica' },
      { rawName: 'Šargarepa', quantity: 2, unit: 'kom' },
      { rawName: 'Beli luk', quantity: 2, unit: 'čen' },
      { rawName: 'Ulje', quantity: 2, unit: 'kašika' },
      { rawName: 'So', quantity: 1, unit: 'kašičica' },
      { rawName: 'Biber', quantity: 0.5, unit: 'kašičica' },
    ],
  },
  {
    name: 'Gulaš',
    description: 'Goveđi gulaš sa lukom i aleovom paprikom.',
    baseServings: 4,
    prepTimeMinutes: 90,
    category: 'Glavno jelo',
    emoji: '🍲',
    steps: [
      'Luk dinstati na ulju dok ne omekša, dodati meso isečeno na kocke.',
      'Zapržiti slatkom aleovom paprikom, zaliti vodom i dodati lovorov list.',
      'Kuvati na tihoj vatri oko sat vremena, pred kraj dodati krompir.',
    ],
    ingredients: [
      { rawName: 'Mleveno meso', quantity: 700, unit: 'g', notes: 'ili govedina na kocke' },
      { rawName: 'Crni luk', quantity: 3, unit: 'glavica' },
      { rawName: 'Krompir', quantity: 500, unit: 'g' },
      { rawName: 'Slatka aleva paprika', quantity: 2, unit: 'kašika' },
      { rawName: 'Lovorov list', quantity: 2, unit: 'kom' },
      { rawName: 'Ulje', quantity: 3, unit: 'kašika' },
      { rawName: 'So', quantity: 1, unit: 'kašičica' },
      { rawName: 'Biber', quantity: 0.5, unit: 'kašičica' },
      { rawName: 'Voda', quantity: 700, unit: 'ml' },
    ],
  },
  {
    name: 'Rižoto sa pečurkama',
    description: 'Kremasti rižoto sa pečurkama i kačkavaljem.',
    baseServings: 4,
    prepTimeMinutes: 35,
    category: 'Glavno jelo',
    emoji: '🍚',
    steps: [
      'Propržiti crni luk i pečurke na maslinovom ulju.',
      'Dodati pirinač, kratko propržiti, pa postepeno dolivati vodu.',
      'Pred kraj umešati kačkavalj i začiniti po ukusu.',
    ],
    ingredients: [
      { rawName: 'Pirinač', quantity: 300, unit: 'g' },
      { rawName: 'Pečurke', quantity: 300, unit: 'g' },
      { rawName: 'Crni luk', quantity: 1, unit: 'glavica' },
      { rawName: 'Kačkavalj', quantity: 80, unit: 'g' },
      { rawName: 'Maslinovo ulje', quantity: 3, unit: 'kašika' },
      { rawName: 'Voda', quantity: 800, unit: 'ml' },
      { rawName: 'So', quantity: 1, unit: 'kašičica' },
      { rawName: 'Biber', quantity: 0.5, unit: 'kašičica' },
    ],
  },
  {
    name: 'Punjene paprike',
    description: 'Paprike punjene mlevenim mesom i pirinčem.',
    baseServings: 4,
    prepTimeMinutes: 80,
    category: 'Glavno jelo',
    emoji: '🫑',
    steps: [
      'Pomešati mleveno meso, pirinač, naseckani luk i začine.',
      'Napunti paprike smesom i složiti u šerpu.',
      'Zaliti vodom i pireom od paradajza, kuvati poklopljeno oko sat vremena.',
    ],
    ingredients: [
      { rawName: 'Paprika', quantity: 8, unit: 'kom' },
      { rawName: 'Mleveno meso', quantity: 500, unit: 'g' },
      { rawName: 'Pirinač', quantity: 100, unit: 'g' },
      { rawName: 'Crni luk', quantity: 1, unit: 'glavica' },
      { rawName: 'Pire od paradajza', quantity: 200, unit: 'ml' },
      { rawName: 'Ulje', quantity: 2, unit: 'kašika' },
      { rawName: 'So', quantity: 1, unit: 'kašičica' },
      { rawName: 'Biber', quantity: 0.5, unit: 'kašičica' },
      { rawName: 'Vegeta', quantity: 1, unit: 'kašičica' },
    ],
  },
  {
    name: 'Tuna salata',
    description: 'Lagana večera od tune, jaja i svežeg povrća.',
    baseServings: 2,
    prepTimeMinutes: 20,
    category: 'Večera',
    emoji: '🥗',
    steps: [
      'Skuvati jaja, ohladiti i iseći.',
      'Pomešati tunu, zelenu salatu, krastavac, paradajz i jaja.',
      'Zaliti maslinovim uljem i limunom, posoliti po ukusu.',
    ],
    ingredients: [
      { rawName: 'Tuna', quantity: 1, unit: 'konzerva' },
      { rawName: 'Jaja', quantity: 2, unit: 'kom' },
      { rawName: 'Zelena salata', quantity: 1, unit: 'kom' },
      { rawName: 'Krastavac', quantity: 1, unit: 'kom' },
      { rawName: 'Paradajz', quantity: 1, unit: 'kom' },
      { rawName: 'Maslinovo ulje', quantity: 2, unit: 'kašika' },
      { rawName: 'Limun', quantity: 0.5, unit: 'kom' },
      { rawName: 'So', quantity: 0.5, unit: 'kašičica' },
    ],
  },
  {
    name: 'Sendvič sa šunkom',
    description: 'Brz sendvič sa šunkom, sirom i salatom.',
    baseServings: 2,
    prepTimeMinutes: 10,
    category: 'Večera',
    emoji: '🥪',
    steps: [
      'Hleb premazati puterom.',
      'Složiti šunku, kačkavalj, zelenu salatu i paradajz.',
      'Po želji kratko zapeći u tiganju.',
    ],
    ingredients: [
      { rawName: 'Hleb', quantity: 4, unit: 'kom' },
      { rawName: 'Šunka', quantity: 120, unit: 'g' },
      { rawName: 'Kačkavalj', quantity: 60, unit: 'g' },
      { rawName: 'Zelena salata', quantity: 4, unit: 'kom' },
      { rawName: 'Paradajz', quantity: 1, unit: 'kom' },
      { rawName: 'Puter', quantity: 20, unit: 'g' },
    ],
  },
  {
    name: 'Voćna salata',
    description: 'Užina od sezonskog voća sa medom i jogurtom.',
    baseServings: 2,
    prepTimeMinutes: 10,
    category: 'Užina',
    emoji: '🍎',
    steps: [
      'Iseći jabuku i bananu, dodati jagode.',
      'Preliti jogurtom i kašikom meda.',
      'Odmah poslužiti.',
    ],
    ingredients: [
      { rawName: 'Jabuka', quantity: 1, unit: 'kom' },
      { rawName: 'Banana', quantity: 1, unit: 'kom' },
      { rawName: 'Jagode', quantity: 150, unit: 'g' },
      { rawName: 'Jogurt', quantity: 150, unit: 'ml' },
      { rawName: 'Med', quantity: 1, unit: 'kašika' },
    ],
  },
  {
    name: 'Smoothie od banane',
    description: 'Brz smoothie od banane, mleka i meda.',
    baseServings: 1,
    prepTimeMinutes: 5,
    category: 'Užina',
    emoji: '🥤',
    steps: [
      'Staviti bananu, mleko, jogurt i med u blender.',
      'Blendati dok ne postane glatko.',
      'Poslužiti odmah, po želji sa borovnicama.',
    ],
    ingredients: [
      { rawName: 'Banana', quantity: 1, unit: 'kom' },
      { rawName: 'Mleko', quantity: 200, unit: 'ml' },
      { rawName: 'Jogurt', quantity: 100, unit: 'ml' },
      { rawName: 'Med', quantity: 1, unit: 'kašika' },
      { rawName: 'Borovnice', quantity: 40, unit: 'g', notes: 'po želji' },
    ],
  },
];

const allRecipes: CreateRecipeInput[] = [
  pasuljRecipe,
  musakaRecipe,
  bolonjezeRecipe,
  ...extraRecipes,
];

const nextWeekMeals: SeedMeal[] = [
  { dayOffset: 0, mealType: 'Doručak', recipeName: 'Omlet sa sirom', servings: 2 },
  { dayOffset: 0, mealType: 'Ručak', recipeName: 'Čorbast pasulj sa dimljenom slaninom', servings: 4 },
  { dayOffset: 0, mealType: 'Večera', recipeName: 'Tuna salata', servings: 2 },
  { dayOffset: 0, mealType: 'Užina', recipeName: 'Voćna salata', servings: 2 },
  { dayOffset: 1, mealType: 'Doručak', recipeName: 'Palačinke', servings: 4 },
  { dayOffset: 1, mealType: 'Ručak', recipeName: 'Musaka krompir–meso', servings: 4 },
  { dayOffset: 1, mealType: 'Večera', recipeName: 'Sendvič sa šunkom', servings: 2 },
  { dayOffset: 1, mealType: 'Užina', recipeName: 'Smoothie od banane', servings: 1 },
  { dayOffset: 2, mealType: 'Doručak', recipeName: 'Ovsena kaša sa bananom', servings: 2 },
  { dayOffset: 2, mealType: 'Ručak', recipeName: 'Bolonjeze špageti', servings: 4 },
  { dayOffset: 2, mealType: 'Večera', recipeName: 'Kajgana sa povrćem', servings: 2 },
  { dayOffset: 3, mealType: 'Doručak', recipeName: 'Omlet sa sirom', servings: 2 },
  { dayOffset: 3, mealType: 'Ručak', recipeName: 'Piletina sa pirinčem', servings: 4 },
  { dayOffset: 3, mealType: 'Večera', recipeName: 'Tuna salata', servings: 2 },
  { dayOffset: 3, mealType: 'Užina', recipeName: 'Voćna salata', servings: 2 },
  { dayOffset: 4, mealType: 'Doručak', recipeName: 'Palačinke', servings: 4 },
  { dayOffset: 4, mealType: 'Ručak', recipeName: 'Gulaš', servings: 4 },
  { dayOffset: 4, mealType: 'Večera', recipeName: 'Sendvič sa šunkom', servings: 2 },
  { dayOffset: 5, mealType: 'Doručak', recipeName: 'Kajgana sa povrćem', servings: 2 },
  { dayOffset: 5, mealType: 'Ručak', recipeName: 'Punjene paprike', servings: 4 },
  { dayOffset: 5, mealType: 'Večera', recipeName: 'Tuna salata', servings: 2 },
  { dayOffset: 5, mealType: 'Užina', recipeName: 'Smoothie od banane', servings: 1 },
  { dayOffset: 6, mealType: 'Doručak', recipeName: 'Ovsena kaša sa bananom', servings: 2 },
  { dayOffset: 6, mealType: 'Ručak', recipeName: 'Rižoto sa pečurkama', servings: 4 },
  { dayOffset: 6, mealType: 'Večera', recipeName: 'Sendvič sa šunkom', servings: 2 },
  { dayOffset: 6, mealType: 'Užina', recipeName: 'Voćna salata', servings: 2 },
];

async function seedCanonicalIngredients(): Promise<void> {
  const existing = await ingredientRepository.findAll();
  const byName = new Map(existing.map((item) => [item.name.trim().toLowerCase(), item]));
  const now = nowISO();

  for (const item of seedIngredients) {
    const key = item.name.trim().toLowerCase();
    const found = byName.get(key);
    if (found) {
      const shouldUpdateCategory = found.category === 'Ostalo' && item.category !== 'Ostalo';
      const shouldUpdateEmoji =
        (!found.emoji && item.emoji) ||
        (item.name.trim().toLowerCase() === 'biber' && found.emoji === '🖤');
      if (shouldUpdateCategory || shouldUpdateEmoji) {
        await ingredientRepository.update({
          ...found,
          category: shouldUpdateCategory ? item.category : found.category,
          emoji: shouldUpdateEmoji ? item.emoji ?? null : found.emoji,
          updatedAt: now,
        });
      }
      continue;
    }

    const ingredient = {
      id: generateUUID(),
      name: item.name,
      category: item.category,
      defaultUnit: item.defaultUnit,
      emoji: item.emoji ?? null,
      trackPresence: false,
      createdAt: now,
      updatedAt: now,
    };
    await ingredientRepository.insert(ingredient);
    await ingredientAliasRepository.insert({
      id: generateUUID(),
      ingredientId: ingredient.id,
      alias: key,
      createdAt: now,
      updatedAt: now,
    });
    if (key === 'so') {
      await ingredientAliasRepository.insert({
        id: generateUUID(),
        ingredientId: ingredient.id,
        alias: 'sol',
        createdAt: now,
        updatedAt: now,
      });
    }
    byName.set(key, ingredient);
  }
}

async function mergeCanonicalIngredientDuplicates(): Promise<void> {
  const ingredients = await ingredientRepository.findAll();
  const groups = new Map<string, typeof ingredients>();
  for (const item of ingredients) {
    const key = ingredientNameKey(item.name);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  for (const group of groups.values()) {
    if (group.length === 0) continue;
    const canonical = canonicalIngredientName(group[0]!.name);
    const keeper = group.find((item) => item.name === canonical) ?? group[0]!;
    if (keeper.name !== canonical) {
      await ingredientRepository.update({
        ...keeper,
        name: canonical,
        updatedAt: nowISO(),
      });
      keeper.name = canonical;
    }

    for (const duplicate of group.filter((item) => item.id !== keeper.id)) {
      await linkIngredients(duplicate.id, keeper.id);
    }

    await ensureAlias(keeper.id, canonical.toLowerCase());
    if (ingredientNameKey(canonical) === 'so') {
      await ensureAlias(keeper.id, 'sol');
      await ensureAlias(keeper.id, 'so');
    }
  }
}

async function seedRecipe(input: CreateRecipeInput): Promise<void> {
  const existing = await recipeRepository.findManyWhere('name = ?', [input.name]);
  if (existing.length > 0) {
    const recipe = existing[0];
    const rows = await recipeIngredientRepository.findManyWhere('recipe_id = ?', [recipe.id]);
    const allIngredients = await ingredientRepository.findAll();
    const nameById = new Map(allIngredients.map((item) => [item.id, item.name]));
    const needsRepair =
      rows.length === 0 ||
      rows.some((row) => !nameById.get(row.ingredientId)?.trim());
    if (!needsRepair) {
      if (!recipe.emoji && input.emoji) {
        await recipeRepository.update({
          ...recipe,
          emoji: input.emoji,
          updatedAt: nowISO(),
        });
      }
      return;
    }
    await updateRecipeWithIngredients(recipe, input);
    return;
  }

  await createRecipeWithIngredients(input);
}

async function seedPantryStaples(): Promise<void> {
  const existingPantry = await pantryItemRepository.findAll();
  const existingIngredients = await ingredientRepository.findAll();
  const pantryIngredientIds = new Set(existingPantry.map((item) => item.ingredientId));
  const ingredientByName = new Map(
    existingIngredients.map((item) => [item.name.trim().toLowerCase(), item])
  );

  for (const item of pantryStaples) {
    const ingredient = ingredientByName.get(item.rawName.trim().toLowerCase());
    if (ingredient && pantryIngredientIds.has(ingredient.id)) {
      continue;
    }
    await addPantryItem({
      rawName: item.rawName,
      quantity: item.quantity,
      unit: item.unit,
      expiresAt:
        item.expiresInDays == null ? undefined : addDays(todayISO(), item.expiresInDays),
    });
  }
}

async function seedMealsForWeek(
  weekStart: string,
  recipeByName: Map<string, { id: string; name: string }>
): Promise<void> {
  const plan = await ensureMealPlan(weekStart);
  const existingMeals = await mealRepository.findManyWhere('meal_plan_id = ?', [plan.id]);
  if (existingMeals.length > 0) {
    return;
  }

  for (const meal of nextWeekMeals) {
    const recipe = recipeByName.get(meal.recipeName);
    if (!recipe) continue;
    await addMeal(
      plan.id,
      addDays(weekStart, meal.dayOffset),
      meal.mealType,
      recipe.id,
      meal.servings,
      undefined,
      { allowPast: true }
    );
  }
}

async function seedDemoMealPlans(): Promise<void> {
  const recipes = await recipeRepository.findAll();
  const recipeByName = new Map(recipes.map((recipe) => [recipe.name, recipe]));
  for (const weekStart of getSeedPlanWeekStarts()) {
    await seedMealsForWeek(weekStart, recipeByName);
  }
}

export async function seedInitialRecipes(): Promise<void> {
  await seedCanonicalIngredients();
  await mergeCanonicalIngredientDuplicates();
  await seedPantryStaples();
  for (const recipe of allRecipes) {
    await seedRecipe(recipe);
  }
  await ensureKitchenItemsFromRecipes();
  await seedDemoMealPlans();
}
