
import { getSurfaceFlagNames } from '@/src/utils/surfaceFlagParser';

describe('SurfaceFlagParser Coverage', () => {
    it('should parse surface flags', () => {
        const result = getSurfaceFlagNames(1); // SURF_LIGHT
        expect(result).toHaveLength(1);
        expect(result[0]).toBe('LIGHT');
    });

    it('should handle unknown flags', () => {
        const result = getSurfaceFlagNames(0x80000000); // Usually not defined
        expect(result).toEqual([]);
    });

    it('should handle multiple flags', () => {
        const result = getSurfaceFlagNames(1 | 4); // LIGHT | SKY
        expect(result.length).toBeGreaterThanOrEqual(2);
        expect(result).toContain('LIGHT');
        expect(result).toContain('SKY');
    });
});
