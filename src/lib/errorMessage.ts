export function errorMessage(err: unknown, fallback = 'Pokušaj ponovo.'): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
