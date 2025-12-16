import { BspEntity } from 'quake2ts/engine';
import { EventEmitter } from 'events';

export class EntityEditorService extends EventEmitter {
    private selectedEntities: Set<BspEntity> = new Set();

    // Selection Management
    select(entity: BspEntity, clearPrevious: boolean = true) {
        if (clearPrevious) {
            this.selectedEntities.clear();
        }
        this.selectedEntities.add(entity);
        this.emit('selectionChanged', Array.from(this.selectedEntities));
    }

    deselect(entity: BspEntity) {
        this.selectedEntities.delete(entity);
        this.emit('selectionChanged', Array.from(this.selectedEntities));
    }

    clearSelection() {
        this.selectedEntities.clear();
        this.emit('selectionChanged', []);
    }

    toggleSelection(entity: BspEntity) {
        if (this.selectedEntities.has(entity)) {
            this.deselect(entity);
        } else {
            this.select(entity, false);
        }
    }

    getSelection(): BspEntity[] {
        return Array.from(this.selectedEntities);
    }

    // Transformation Logic (Stub for now)
    translateSelection(delta: [number, number, number]) {
        // We would update the entity properties here
        // And emit an 'entityUpdated' event
        this.selectedEntities.forEach(entity => {
            if (entity.properties && entity.properties.origin) {
                 const parts = entity.properties.origin.split(' ').map(parseFloat);
                 if (parts.length === 3) {
                     parts[0] += delta[0];
                     parts[1] += delta[1];
                     parts[2] += delta[2];
                     entity.properties.origin = parts.join(' ');
                 }
            }
        });
        this.emit('entitiesUpdated', Array.from(this.selectedEntities));
    }
}

export const entityEditorService = new EntityEditorService();
