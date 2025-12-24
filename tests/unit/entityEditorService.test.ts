import { EntityEditorService, SelectionMode } from '@/src/services/entityEditorService';
import { BspEntity } from 'quake2ts/engine';

describe('EntityEditorService', () => {
  let service: EntityEditorService;

  beforeEach(() => {
    // Reset singleton instance for each test
    // Since it's a singleton, we might need a way to reset it or just rely on state reset
    service = EntityEditorService.getInstance();
    service.reset();
  });

  const mockEntity1: BspEntity = {
    classname: 'info_player_start',
    properties: { origin: '0 0 0' }
  } as any;

  const mockEntity2: BspEntity = {
    classname: 'weapon_shotgun',
    properties: { origin: '100 0 0' }
  } as any;

  test('should initialize with no selection', () => {
    expect(service.getSelectedEntityIds()).toEqual([]);
  });

  test('should set entities', () => {
    service.setEntities([mockEntity1, mockEntity2]);
    expect(service.getEntity(0)).toBe(mockEntity1);
    expect(service.getEntity(1)).toBe(mockEntity2);
  });

  test('should select entity', () => {
    service.setEntities([mockEntity1, mockEntity2]);
    service.selectEntity(0);
    expect(service.getSelectedEntityIds()).toEqual([0]);
    expect(service.getSelectedEntities()).toEqual([mockEntity1]);
  });

  test('should support multi-selection', () => {
    service.setEntities([mockEntity1, mockEntity2]);
    service.selectEntity(0);
    service.selectEntity(1, SelectionMode.Add);
    expect(service.getSelectedEntityIds()).toContain(0);
    expect(service.getSelectedEntityIds()).toContain(1);
  });

  test('should toggle selection', () => {
      service.setEntities([mockEntity1, mockEntity2]);
      service.selectEntity(0);
      service.selectEntity(0, SelectionMode.Toggle);
      expect(service.getSelectedEntityIds()).toEqual([]);
  });

  test('should notify listeners on change', () => {
    const listener = vi.fn();
    service.subscribe(listener);
    service.setEntities([mockEntity1]);
    expect(listener).toHaveBeenCalled();
    service.selectEntity(0);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
