import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { MapEditorProvider, useMapEditor, EditorMode } from '@/src/context/MapEditorContext';

describe('MapEditorContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MapEditorProvider>{children}</MapEditorProvider>
  );

  it('provides default values', () => {
    const { result } = renderHook(() => useMapEditor(), { wrapper });

    expect(result.current.isEditorActive).toBe(false);
    expect(result.current.selectedEntityIds.size).toBe(0);
    expect(result.current.mode).toBe(EditorMode.Select);
    expect(result.current.hoveredEntityId).toBeNull();
  });

  it('toggles editor active state', () => {
    const { result } = renderHook(() => useMapEditor(), { wrapper });

    act(() => {
      result.current.setEditorActive(true);
    });
    expect(result.current.isEditorActive).toBe(true);
  });

  it('selects single entity', () => {
    const { result } = renderHook(() => useMapEditor(), { wrapper });

    act(() => {
      result.current.selectEntity(1);
    });
    expect(result.current.selectedEntityIds.has(1)).toBe(true);
    expect(result.current.selectedEntityIds.size).toBe(1);

    act(() => {
      result.current.selectEntity(2);
    });
    expect(result.current.selectedEntityIds.has(2)).toBe(true);
    expect(result.current.selectedEntityIds.size).toBe(1); // Replaces selection
  });

  it('selects multiple entities', () => {
    const { result } = renderHook(() => useMapEditor(), { wrapper });

    act(() => {
      result.current.selectEntity(1, true);
    });
    act(() => {
      result.current.selectEntity(2, true);
    });

    expect(result.current.selectedEntityIds.has(1)).toBe(true);
    expect(result.current.selectedEntityIds.has(2)).toBe(true);
    expect(result.current.selectedEntityIds.size).toBe(2);
  });

  it('deselects entity', () => {
    const { result } = renderHook(() => useMapEditor(), { wrapper });

    act(() => {
      result.current.selectEntity(1, true);
      result.current.deselectEntity(1);
    });

    expect(result.current.selectedEntityIds.has(1)).toBe(false);
  });

  it('clears selection', () => {
    const { result } = renderHook(() => useMapEditor(), { wrapper });

    act(() => {
      result.current.selectEntity(1, true);
      result.current.selectEntity(2, true);
      result.current.clearSelection();
    });

    expect(result.current.selectedEntityIds.size).toBe(0);
  });
});
