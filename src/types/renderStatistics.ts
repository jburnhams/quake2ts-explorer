export interface RenderStatistics {
    // GPU timings (if available)
    gpuTimeMs?: number;

    // CPU timings
    cpuFrameTimeMs: number;
    simulationTimeMs?: number;
    renderTimeMs?: number;

    // Rendering metrics
    drawCalls: number;
    triangles: number;
    vertices: number;
    textureBinds: number;
    shaderSwitches?: number;

    // Visibility metrics
    visibleSurfaces: number;
    culledSurfaces?: number;

    // Memory usage (if available)
    textureMemoryBytes?: number;
    bufferMemoryBytes?: number;
}
