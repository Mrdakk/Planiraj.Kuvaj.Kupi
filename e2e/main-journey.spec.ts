import { expect, test, type Page } from '@playwright/test';

/**
 * Web put glavnog toka: kuhinja → recept → plan → Fali → kupovina.
 * Donji sheet-ovi na webu ispadaju ispod viewporta; test to tvrdi, pa
 * potvrdu na tom sheetu šalje DOM klikom da računica ipak prođe.
 * Kamera i QR skener nisu u ovom testu: to je expo-camera, samo native.
 */

async function seedHousehold(page: Page) {
  const seeded = await page.evaluate(async () => {
    const db = (globalThis as { __pkkSqlite?: { runAsync: (...args: unknown[]) => Promise<void> } })
      .__pkkSqlite;
    if (!db) return false;
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO household_state (
        id, household_id, member_id, display_name, join_token, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'current',
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        'Marko',
        '33333333-3333-4333-8333-333333333333',
        now,
        now,
      ]
    );
    return true;
  });
  expect(seeded).toBe(true);
}

async function tab(page: Page, name: string) {
  await page.getByRole('tab', { name }).last().click();
}

async function chooseGrams(page: Page) {
  await page
    .locator('select')
    .filter({ has: page.locator('option[value="g"]') })
    .last()
    .selectOption('g');
}

test('glavni tok od kuhinje do liste, i vidljive web prepreke', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Ko kuva ovde?')).toBeVisible();

  await page.getByRole('button', { name: 'Nastavi' }).click();
  await expect(page.getByText('Unesi ime.', { exact: true })).toBeVisible();

  await page.getByLabel('Ime').fill('Marko');
  await page.getByRole('button', { name: 'Nastavi' }).click();
  await expect(page.getByText('Aplikacija nije podešena')).toBeVisible();
  await page.getByRole('button', { name: 'Pokušaj ponovo' }).click();
  await expect(page.getByText('Aplikacija nije podešena')).toBeVisible();

  await seedHousehold(page);
  await page.reload();
  await expect(page.getByText('Nema obroka za ovaj dan')).toBeVisible();

  await page.getByRole('button', { name: 'Prethodna nedelja' }).click();
  await expect(page.getByText('Ovaj dan je prošao')).toBeVisible();
  await expect(page.getByText('+ Dodaj obrok')).toBeVisible();
  await page.getByRole('button', { name: 'Nazad na ovu nedelju' }).click();

  await tab(page, 'Kuhinja');
  await page.getByText('+ Dodaj namirnicu').click();
  await page.getByLabel('Naziv sastojka').fill('Pirinač');
  await page.getByLabel('Količina').fill('200');
  await chooseGrams(page);
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('200 g')).toBeVisible();

  await page.getByPlaceholder('Pretraga...').fill('burek');
  await expect(page.getByText('Još nemaš namirnica')).toBeVisible();
  await page.getByPlaceholder('Pretraga...').fill('');
  await expect(page.getByText('200 g')).toBeVisible();

  await tab(page, 'Više');
  await page.getByText('Recepti', { exact: true }).click();
  await page.getByText('+ Novi recept').click();
  await page.getByLabel('Naziv recepta').fill('Rizoto');
  await page.getByText('Dodaj naziv', { exact: true }).click();

  const renameTitle = page.getByText('Preimenuj namirnicu');
  await expect(renameTitle).toBeAttached();
  const renameBox = await renameTitle.boundingBox();
  expect(renameBox).not.toBeNull();
  expect(renameBox!.y).toBeGreaterThan(844);

  await page.getByRole('textbox', { name: 'Naziv', exact: true }).evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(el, 'Pirinač');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.getByRole('button', { name: 'Sačuvaj', exact: true }).evaluate((el: HTMLElement) => {
    el.click();
  });
  await expect(page.getByText('Dodaj naziv', { exact: true })).toBeHidden();

  await page.getByLabel('Količina').last().fill('500');
  await chooseGrams(page);
  await page.getByLabel('Koraci pripreme').fill('Prokuvaj pirinač.');
  await page.getByRole('button', { name: 'Sačuvaj recept' }).click();
  await expect(page.getByText('500 g')).toBeVisible();

  await page.getByRole('button', { name: 'Dodaj u plan' }).click();
  await expect(page.getByLabel('Broj porcija')).toHaveValue('4');
  await page.getByRole('button', { name: 'Dodaj u plan' }).click();
  await page.waitForURL(/\/$/);
  await expect(page.getByText('4 porcije').last()).toBeVisible();

  await tab(page, 'Fali');
  await expect(page.getByText('300 g').last()).toBeVisible();
  await page.getByText('Sve zajedno', { exact: true }).click();
  await expect(page.getByText('Imaš 200 g')).toBeVisible();
  await expect(page.getByText('300 g').last()).toBeVisible();

  await page.getByRole('checkbox').last().click();
  await page.getByRole('button', { name: 'Dodaj na kupovinu (1)' }).click();
  await expect(page.getByText('već na listi')).toBeVisible();

  await tab(page, 'Kupovina');
  await expect(page.getByText('300 g').last()).toBeVisible();

  await tab(page, 'Plan');
  await page.getByText('4 porcije').last().click();
  await page.getByRole('button', { name: 'Označi kao kuvano' }).click();
  const confirmTitle = page.getByText('Potvrdi potrošnju');
  await expect(confirmTitle).toBeAttached();
  const confirmBox = await confirmTitle.boundingBox();
  expect(confirmBox).not.toBeNull();
  expect(confirmBox!.y).toBeGreaterThan(844);
  await expect(page.getByText(/imaš 200 g/)).toBeAttached();
  await expect(page.getByText('Delimično')).toBeAttached();
});
