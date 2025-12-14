// Bit flags for surface properties
export const SURF_LIGHT = 0x1;       // value will hold the light strength
export const SURF_SLICK = 0x2;       // effects game physics
export const SURF_SKY = 0x4;         // don't draw, but add to skybox
export const SURF_WARP = 0x8;        // turbulent water warp
export const SURF_TRANS33 = 0x10;
export const SURF_TRANS66 = 0x20;
export const SURF_FLOWING = 0x40;    // scroll towards angle
export const SURF_NODRAW = 0x80;     // don't bother referencing the texture

export function getSurfaceFlagNames(flags: number): string[] {
  const names: string[] = [];

  if (flags & SURF_LIGHT) names.push('LIGHT');
  if (flags & SURF_SLICK) names.push('SLICK');
  if (flags & SURF_SKY) names.push('SKY');
  if (flags & SURF_WARP) names.push('WARP');
  if (flags & SURF_TRANS33) names.push('TRANS33');
  if (flags & SURF_TRANS66) names.push('TRANS66');
  if (flags & SURF_FLOWING) names.push('FLOWING');
  if (flags & SURF_NODRAW) names.push('NODRAW');

  return names;
}
