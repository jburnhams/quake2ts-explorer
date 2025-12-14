import React from 'react';
import './PerformanceStats.css';
import { RenderStatistics } from '@/src/types/renderStatistics';
import { PerformanceGraph } from './PerformanceGraph';

interface PerformanceStatsProps {
    fps: number;
    minFps?: number;
    maxFps?: number;
    stats: RenderStatistics | null;
    history?: { fps: number; frameTime: number }[];
}

export const PerformanceStats: React.FC<PerformanceStatsProps> = ({ fps, minFps, maxFps, stats, history }) => {
    const fpsColor = fps >= 55 ? '#4ade80' : fps >= 30 ? '#facc15' : '#ef4444';

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="performance-stats">
            <div className="stats-section">
                <div className="stats-row fps-row">
                    <span className="label">FPS</span>
                    <span className="value" style={{ color: fpsColor }}>{fps}</span>
                </div>
                {minFps !== undefined && maxFps !== undefined && (
                    <div className="stats-row sub-row">
                        <span className="label">Min/Max</span>
                        <span className="value">{minFps} / {maxFps}</span>
                    </div>
                )}
            </div>

            {history && <PerformanceGraph history={history} />}

            {stats && (
                <>
                    <div className="stats-divider" />
                    <div className="stats-section">
                        <div className="stats-header">Rendering</div>
                        <div className="stats-row">
                            <span className="label">Draw Calls</span>
                            <span className="value">{stats.drawCalls}</span>
                        </div>
                        <div className="stats-row">
                            <span className="label">Triangles</span>
                            <span className="value">{stats.triangles.toLocaleString()}</span>
                        </div>
                        <div className="stats-row">
                            <span className="label">Vertices</span>
                            <span className="value">{stats.vertices.toLocaleString()}</span>
                        </div>
                        <div className="stats-row">
                            <span className="label">Textures</span>
                            <span className="value">{stats.textureBinds}</span>
                        </div>
                         <div className="stats-row">
                            <span className="label">Visible/Total</span>
                            <span className="value">{stats.visibleSurfaces} {stats.culledSurfaces !== undefined ? `/ ${stats.visibleSurfaces + stats.culledSurfaces}` : ''}</span>
                        </div>
                    </div>

                    <div className="stats-divider" />
                    <div className="stats-section">
                        <div className="stats-header">Timing</div>
                        <div className="stats-row">
                            <span className="label">Total CPU</span>
                            <span className="value">{stats.cpuFrameTimeMs.toFixed(2)} ms</span>
                        </div>
                        {stats.simulationTimeMs !== undefined && (
                            <div className="stats-row sub-row">
                                <span className="label">Simulation</span>
                                <span className="value">
                                    {stats.simulationTimeMs.toFixed(2)} ms
                                    <span className="dim-text"> ({Math.round((stats.simulationTimeMs / stats.cpuFrameTimeMs) * 100)}%)</span>
                                </span>
                            </div>
                        )}
                        {stats.renderTimeMs !== undefined && (
                            <div className="stats-row sub-row">
                                <span className="label">Rendering</span>
                                <span className="value">
                                    {stats.renderTimeMs.toFixed(2)} ms
                                    <span className="dim-text"> ({Math.round((stats.renderTimeMs / stats.cpuFrameTimeMs) * 100)}%)</span>
                                </span>
                            </div>
                        )}
                        {stats.gpuTimeMs !== undefined && (
                            <div className="stats-row">
                                <span className="label">GPU Frame</span>
                                <span className="value">{stats.gpuTimeMs.toFixed(2)} ms</span>
                            </div>
                        )}
                    </div>

                    {(stats.textureMemoryBytes !== undefined || stats.bufferMemoryBytes !== undefined) && (
                        <>
                            <div className="stats-divider" />
                            <div className="stats-section">
                                <div className="stats-header">Memory</div>
                                {stats.textureMemoryBytes !== undefined && (
                                    <div className="stats-row">
                                        <span className="label">Textures</span>
                                        <span className="value">{formatBytes(stats.textureMemoryBytes)}</span>
                                    </div>
                                )}
                                {stats.bufferMemoryBytes !== undefined && (
                                    <div className="stats-row">
                                        <span className="label">Buffers</span>
                                        <span className="value">{formatBytes(stats.bufferMemoryBytes)}</span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};
