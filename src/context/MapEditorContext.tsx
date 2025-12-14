import React, { createContext, useContext, useState, ReactNode } from 'react';

export enum EditorMode {
  Select = 'select',
  Translate = 'translate',
  Rotate = 'rotate',
  Scale = 'scale'
}

interface MapEditorContextProps {
  isEditorActive: boolean;
  setEditorActive: (active: boolean) => void;
  selectedEntityIds: Set<number>;
  selectEntity: (id: number, multi?: boolean) => void;
  deselectEntity: (id: number) => void;
  clearSelection: () => void;
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  hoveredEntityId: number | null;
  setHoveredEntityId: (id: number | null) => void;
}

const MapEditorContext = createContext<MapEditorContextProps | undefined>(undefined);

export function MapEditorProvider({ children }: { children: ReactNode }) {
  const [isEditorActive, setEditorActive] = useState(false);
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<EditorMode>(EditorMode.Select);
  const [hoveredEntityId, setHoveredEntityId] = useState<number | null>(null);

  const selectEntity = (id: number, multi: boolean = false) => {
    setSelectedEntityIds(prev => {
      if (multi) {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      } else {
        return new Set([id]);
      }
    });
  };

  const deselectEntity = (id: number) => {
    setSelectedEntityIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedEntityIds(new Set());
  };

  return (
    <MapEditorContext.Provider value={{
      isEditorActive,
      setEditorActive,
      selectedEntityIds,
      selectEntity,
      deselectEntity,
      clearSelection,
      mode,
      setMode,
      hoveredEntityId,
      setHoveredEntityId
    }}>
      {children}
    </MapEditorContext.Provider>
  );
}

export function useMapEditor() {
  const context = useContext(MapEditorContext);
  if (context === undefined) {
    throw new Error('useMapEditor must be used within a MapEditorProvider');
  }
  return context;
}
