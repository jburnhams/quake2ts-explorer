
export interface EditorEntity {
    // Unique ID for the editor session (index in the array)
    id: number;
    // The underlying BSP entity
    entity: any; // Using any for BspEntity as we might modify it and quake2ts types are read-only-ish
    // Editor state
    isSelected: boolean;
    // Working copy of properties (so we don't mutate original until save/commit)
    properties: Record<string, string>;
    // Cached position/angles for gizmo
    origin?: { x: number, y: number, z: number };
    angles?: { x: number, y: number, z: number };
}

export type SelectionMode = 'single' | 'multi' | 'box';

export class EntityEditorService {
    private entities: EditorEntity[] = [];
    private listeners: Set<() => void> = new Set();
    private map: any = null; // BspMap
    private isTransforming: boolean = false;

    constructor() {}

    loadEntities(map: any) {
        this.map = map;
        const bspEntities = (map.entities && map.entities.entities) ? map.entities.entities : map.entities;

        if (!Array.isArray(bspEntities)) {
            console.warn("Could not load entities for editor");
            return;
        }

        this.entities = bspEntities.map((ent: any, index: number) => {
             const props = { ...ent.properties };
             const origin = this.parseVec3(props.origin);
             const angles = this.parseVec3(props.angle ? `0 ${props.angle} 0` : props.angles); // Handle simple angle vs angles

             return {
                 id: index,
                 entity: ent,
                 isSelected: false,
                 properties: props,
                 origin,
                 angles
             };
        });

        this.notify();
    }

    getEntities() {
        return this.entities;
    }

    getSelectedEntities() {
        return this.entities.filter(e => e.isSelected);
    }

    select(index: number, mode: SelectionMode = 'single') {
        if (index < 0 || index >= this.entities.length) {
            if (mode === 'single') {
                this.deselectAll();
            }
            return;
        }

        if (mode === 'single') {
            this.entities.forEach(e => e.isSelected = (e.id === index));
        } else if (mode === 'multi') {
            this.entities[index].isSelected = !this.entities[index].isSelected;
        }

        this.notify();
    }

    deselectAll() {
        this.entities.forEach(e => e.isSelected = false);
        this.notify();
    }

    startTransform() {
        this.isTransforming = true;
    }

    commitTransform() {
        this.isTransforming = false;
        // In a real implementation, we would push to Undo Stack here
        this.notify();
    }

    previewMove(axis: 'x' | 'y' | 'z', amount: number) {
        if (!this.isTransforming) return;

        const selected = this.getSelectedEntities();
        selected.forEach(e => {
            if (e.origin) {
                // We should store initial state on startTransform to avoid drift, but for simple preview:
                const newVal = e.origin[axis] + amount;

                // Update local model
                e.origin[axis] = newVal;

                // Update properties string
                e.properties.origin = `${e.origin.x} ${e.origin.y} ${e.origin.z}`;

                // Also update underlying entity properties so renderer sees it?
                // The renderer reads from map.entities, which are BspEntity objects.
                // We should sync back to them if we want immediate visual feedback from adapter.
                if (e.entity && e.entity.properties) {
                    e.entity.properties.origin = e.properties.origin;
                }
            }
        });

        this.notify();
    }

    // Subscribe to changes
    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(l => l());
    }

    private parseVec3(str: string | undefined): { x: number, y: number, z: number } | undefined {
        if (!str) return undefined;
        const parts = str.split(' ').map(parseFloat);
        if (parts.length >= 3 && !parts.some(isNaN)) {
            return { x: parts[0], y: parts[1], z: parts[2] };
        }
        return undefined;
    }
}

export const entityEditorService = new EntityEditorService();
