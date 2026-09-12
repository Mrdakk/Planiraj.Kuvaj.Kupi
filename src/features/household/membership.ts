export const JOIN_URL_SCHEME = 'planirajkuvajkupi';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeDisplayName(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : null;
}

export function buildJoinUrl(token: string): string {
  return `${JOIN_URL_SCHEME}://join/${token}`;
}

export function parseJoinUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^planirajkuvajkupi:\/\/join\/([^/?#]+)\/?$/i);
  if (!match) return null;

  const token = match[1];
  return UUID_RE.test(token) ? token.toLowerCase() : null;
}

export function parseJoinPayload(value: string): string | null {
  const fromUrl = parseJoinUrl(value);
  if (fromUrl) return fromUrl;

  const trimmed = value.trim();
  return UUID_RE.test(trimmed) ? trimmed.toLowerCase() : null;
}

export interface HouseholdMemberRef {
  id: string;
  displayName: string;
}

export type MemberJoinResolution =
  | { action: 'rebind'; memberId: string; displayName: string }
  | { action: 'insert'; memberId: null; displayName: string };

export function resolveMemberJoin(
  members: HouseholdMemberRef[],
  name: string
): MemberJoinResolution | null {
  const displayName = normalizeDisplayName(name);
  if (!displayName) return null;

  const needle = displayName.toLocaleLowerCase('sr');
  const existing = members.find(
    (member) => member.displayName.toLocaleLowerCase('sr') === needle
  );

  if (existing) {
    return {
      action: 'rebind',
      memberId: existing.id,
      displayName: existing.displayName,
    };
  }

  return { action: 'insert', memberId: null, displayName };
}

export function shouldSeedKitchen(_mode: 'create' | 'join'): boolean {
  return false;
}
