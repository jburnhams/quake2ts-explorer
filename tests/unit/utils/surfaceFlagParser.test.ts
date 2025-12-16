import {
  getSurfaceFlagNames,
  SURF_LIGHT, SURF_SLICK, SURF_SKY,
  SURF_WARP, SURF_TRANS33, SURF_TRANS66, SURF_FLOWING, SURF_NODRAW
} from '@/src/utils/surfaceFlagParser';

describe('surfaceFlagParser', () => {
  it('should return empty array for 0 flags', () => {
    expect(getSurfaceFlagNames(0)).toEqual([]);
  });

  it('should identify individual flags', () => {
    expect(getSurfaceFlagNames(SURF_LIGHT)).toContain('LIGHT');
    expect(getSurfaceFlagNames(SURF_SLICK)).toContain('SLICK');
    expect(getSurfaceFlagNames(SURF_SKY)).toContain('SKY');
    expect(getSurfaceFlagNames(SURF_WARP)).toContain('WARP');
    expect(getSurfaceFlagNames(SURF_TRANS33)).toContain('TRANS33');
    expect(getSurfaceFlagNames(SURF_TRANS66)).toContain('TRANS66');
    expect(getSurfaceFlagNames(SURF_FLOWING)).toContain('FLOWING');
    expect(getSurfaceFlagNames(SURF_NODRAW)).toContain('NODRAW');
  });

  it('should identify combined flags', () => {
    const flags = SURF_LIGHT | SURF_SLICK | SURF_WARP;
    const names = getSurfaceFlagNames(flags);
    expect(names).toContain('LIGHT');
    expect(names).toContain('SLICK');
    expect(names).toContain('WARP');
    expect(names).not.toContain('SKY');
  });

  it('should ignore unknown flags', () => {
    const flags = 0x8000; // Unknown flag
    expect(getSurfaceFlagNames(flags)).toEqual([]);
  });
});
