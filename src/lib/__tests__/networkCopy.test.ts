import { describe, expect, it } from '@jest/globals';
import { networkLabel, syncStatusLabel } from '../networkCopy';

describe('networkLabel', () => {
  it('uses Serbian labels', () => {
    expect(networkLabel(true)).toBe('Na mreži');
    expect(networkLabel(false)).toBe('Van mreže');
  });
});

describe('syncStatusLabel', () => {
  it('uses Serbian for offline', () => {
    expect(syncStatusLabel('offline', false)).toBe('Van mreže');
  });

  it('keeps synced when the device is online', () => {
    expect(syncStatusLabel('synced', true)).toBe('Sinhronizovano');
  });
});
