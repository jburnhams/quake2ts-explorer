import { BspEntity } from '@quake2ts/engine';

export enum SelectionMode {
  Single,
  Add,
  Toggle
}

export type EditorAction = {
  undo: () => void;
  redo: () => void;
};

export class EntityEditorService {
  private static instance: EntityEditorService;
  private selectedEntityIds: Set<number> = new Set();
  private entities: Map<number, BspEntity> = new Map();
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  static getInstance(): EntityEditorService {
    if (!EntityEditorService.instance) {
      EntityEditorService.instance = new EntityEditorService();
    }
    return EntityEditorService.instance;
  }

  reset() {
      this.selectedEntityIds.clear();
      this.entities.clear();
      this.notifyListeners();
  }

  // Initialize with entities from the map
  setEntities(entities: BspEntity[]) {
      this.entities.clear();
      // Assuming BspEntity doesn't strictly have a unique ID, we might need to assign one or rely on index.
      // quake2ts BspEntity usually just has properties.
      // Let's assume we can index them by their position in the array for now.
      entities.forEach((entity, index) => {
          this.entities.set(index, entity);
      });
      this.notifyListeners();
  }

  selectEntity(index: number, mode: SelectionMode = SelectionMode.Single) {
    if (mode === SelectionMode.Single) {
      this.selectedEntityIds.clear();
      this.selectedEntityIds.add(index);
    } else if (mode === SelectionMode.Add) {
      this.selectedEntityIds.add(index);
    } else if (mode === SelectionMode.Toggle) {
        if (this.selectedEntityIds.has(index)) {
            this.selectedEntityIds.delete(index);
        } else {
            this.selectedEntityIds.add(index);
        }
    }
    this.notifyListeners();
  }

  deselectAll() {
    this.selectedEntityIds.clear();
    this.notifyListeners();
  }

  getSelectedEntityIds(): number[] {
    return Array.from(this.selectedEntityIds);
  }

  getSelectedEntities(): BspEntity[] {
      return this.getSelectedEntityIds().map(id => this.entities.get(id)).filter(e => e !== undefined) as BspEntity[];
  }

  getEntity(index: number): BspEntity | undefined {
      return this.entities.get(index);
  }

  updateEntity(index: number, newEntity: BspEntity) {
      if (this.entities.has(index)) {
          this.entities.set(index, newEntity);
          this.notifyListeners();
      }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }
}
