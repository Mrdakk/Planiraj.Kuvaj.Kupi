import { describe, expect, it } from '@jest/globals';
import {
  buildJoinUrl,
  normalizeDisplayName,
  parseJoinPayload,
  parseJoinUrl,
  resolveMemberJoin,
  shouldSeedKitchen,
} from '../membership';

describe('normalizeDisplayName', () => {
  it('trims and collapses inner space', () => {
    expect(normalizeDisplayName('  Mama   Ana  ')).toBe('Mama Ana');
  });

  it('rejects a blank name', () => {
    expect(normalizeDisplayName('   ')).toBeNull();
    expect(normalizeDisplayName('')).toBeNull();
  });
});

describe('join URL', () => {
  it('builds and parses the household join token', () => {
    const token = '11111111-1111-1111-1111-111111111111';
    const url = buildJoinUrl(token);
    expect(url).toBe(`planirajkuvajkupi://join/${token}`);
    expect(parseJoinUrl(url)).toBe(token);
  });

  it('rejects a payload that is not a join URL', () => {
    expect(parseJoinUrl('https://example.com')).toBeNull();
    expect(parseJoinUrl('planirajkuvajkupi://join/not-a-uuid')).toBeNull();
    expect(parseJoinUrl('')).toBeNull();
  });

  it('parses a raw join token as well as a URL', () => {
    const token = '11111111-1111-1111-1111-111111111111';
    expect(parseJoinPayload(token)).toBe(token);
    expect(parseJoinPayload(`planirajkuvajkupi://join/${token}`)).toBe(token);
    expect(parseJoinPayload('not-valid')).toBeNull();
  });
});

describe('resolveMemberJoin', () => {
  const members = [
    { id: 'm-1', displayName: 'Mama' },
    { id: 'm-2', displayName: 'Tata' },
  ];

  it('rebinds when the same name already exists', () => {
    expect(resolveMemberJoin(members, ' mama ')).toEqual({
      action: 'rebind',
      memberId: 'm-1',
      displayName: 'Mama',
    });
  });

  it('inserts a new member when the name is free', () => {
    expect(resolveMemberJoin(members, 'Ana')).toEqual({
      action: 'insert',
      memberId: null,
      displayName: 'Ana',
    });
  });

  it('returns null when the name is blank', () => {
    expect(resolveMemberJoin(members, '  ')).toBeNull();
  });
});

describe('shouldSeedKitchen', () => {
  it('never loads demo kitchen data', () => {
    expect(shouldSeedKitchen('create')).toBe(false);
    expect(shouldSeedKitchen('join')).toBe(false);
  });
});
