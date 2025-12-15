import { EntityEditorService, entityEditorService } from '../../../src/services/entityEditorService';

describe('EntityEditorService', () => {
    let service: EntityEditorService;

    beforeEach(() => {
        // Since it's a singleton exported as const, we might need to reset it or instantiate new one if possible.
        // However, the class is exported too.
        service = new EntityEditorService();
    });

    it('should load entities from map', () => {
        const mockMap = {
            entities: {
                entities: [
                    { properties: { classname: 'worldspawn', origin: '0 0 0' } },
                    { properties: { classname: 'info_player_start', origin: '100 0 0', angle: '90' } }
                ]
            }
        };

        service.loadEntities(mockMap);
        const entities = service.getEntities();

        expect(entities.length).toBe(2);
        expect(entities[0].properties.classname).toBe('worldspawn');
        expect(entities[1].origin).toEqual({ x: 100, y: 0, z: 0 });
        expect(entities[1].angles).toEqual({ x: 0, y: 90, z: 0 });
    });

    it('should handle single selection', () => {
        const mockMap = {
            entities: {
                entities: [
                    { properties: { classname: 'e1' } },
                    { properties: { classname: 'e2' } }
                ]
            }
        };
        service.loadEntities(mockMap);

        service.select(0, 'single');
        expect(service.getSelectedEntities().length).toBe(1);
        expect(service.getSelectedEntities()[0].id).toBe(0);

        service.select(1, 'single');
        expect(service.getSelectedEntities().length).toBe(1);
        expect(service.getSelectedEntities()[0].id).toBe(1);
    });

    it('should handle multi selection', () => {
        const mockMap = {
            entities: {
                entities: [
                    { properties: { classname: 'e1' } },
                    { properties: { classname: 'e2' } }
                ]
            }
        };
        service.loadEntities(mockMap);

        service.select(0, 'multi');
        expect(service.getSelectedEntities().length).toBe(1);

        service.select(1, 'multi');
        expect(service.getSelectedEntities().length).toBe(2);

        service.select(0, 'multi'); // Deselect
        expect(service.getSelectedEntities().length).toBe(1);
        expect(service.getSelectedEntities()[0].id).toBe(1);
    });

    it('should notify listeners on change', () => {
         const mockMap = { entities: { entities: [{ properties: {} }] } };
         service.loadEntities(mockMap);

         const listener = jest.fn();
         service.subscribe(listener);

         service.select(0);
         expect(listener).toHaveBeenCalled();
    });
});
