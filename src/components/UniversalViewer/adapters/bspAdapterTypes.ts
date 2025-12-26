import { ViewerAdapter } from './types';
import { Texture2D } from '@quake2ts/engine';

export interface BspViewerAdapter extends ViewerAdapter {
    getLightmaps(): Texture2D[];
    getLightmapCount(): number;
    getLightmapSize(): number;
}
