/** Lowercase and strip Serbian diacritics so "cokolada" finds "Čokolada". */
export function foldSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}
