import { getSurfaceFlagNames, SURF_LIGHT, SURF_SLICK, SURF_SKY } from '@/src/utils/surfaceFlagParser';

describe('surfaceFlagParser', () => {
  it('should return empty array for 0 flags', () => {
    expect(getSurfaceFlagNames(0)).toEqual([]);
  });

  it('should identify individual flags', () => {
    expect(getSurfaceFlagNames(SURF_LIGHT)).toContain('LIGHT');
    expect(getSurfaceFlagNames(SURF_SLICK)).toContain('SLICK');
    expect(getSurfaceFlagNames(SURF_SKY)).toContain('SKY');
  });

  it('should identify combined flags', () => {
    const flags = SURF_LIGHT | SURF_SLICK;
    const names = getSurfaceFlagNames(flags);
    expect(names).toContain('LIGHT');
    expect(names).toContain('SLICK');
    expect(names).not.toContain('SKY');
  });

  it('should ignore unknown flags', () => {
    const flags = 0x8000; // Unknown flag
    expect(getSurfaceFlagNames(flags)).toEqual([]);
  });
});
