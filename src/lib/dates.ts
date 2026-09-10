/** Calendar date helpers. Storage is always ISO `yyyy-MM-dd`; display is `dd-mm-yyyy`. */

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null;
  const match = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const display = iso.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (display) {
    const date = new Date(Number(display[3]), Number(display[2]) - 1, Number(display[1]), 12, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function formatDisplayDateFromDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
}

export function formatDisplayDate(iso: string | null | undefined): string {
  const date = parseISODate(iso);
  if (!date) return '';
  return formatDisplayDateFromDate(date);
}

export function isCreatedToday(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return false;
  return toISODate(date) === todayISO();
}

export function dateKey(value: string | null | undefined): string {
  const match = value?.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}
