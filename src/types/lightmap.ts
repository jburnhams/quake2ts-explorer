export interface BspLightmap {
    width: number;
    height: number;
    data: Uint8Array; // RGB data
    page?: number; // Which atlas page
    x?: number;
    y?: number;
}
