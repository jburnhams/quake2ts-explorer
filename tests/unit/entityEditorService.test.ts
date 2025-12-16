import { EntityEditorService } from '@/src/services/entityEditorService';
import { BspEntity } from 'quake2ts/engine';

describe('EntityEditorService', () => {
    let service: EntityEditorService;
    let mockEntity1: BspEntity;
    let mockEntity2: BspEntity;

    beforeEach(() => {
        service = new EntityEditorService();
        mockEntity1 = { classname: 'info_player_start', properties: { origin: '0 0 0' } } as BspEntity;
        mockEntity2 = { classname: 'weapon_shotgun', properties: { origin: '10 10 10' } } as BspEntity;
    });

    test('select should select entity and clear previous if requested', () => {
        service.select(mockEntity1);
        expect(service.getSelection()).toEqual([mockEntity1]);

        service.select(mockEntity2, true);
        expect(service.getSelection()).toEqual([mockEntity2]);

        service.select(mockEntity1, false);
        expect(service.getSelection()).toContain(mockEntity1);
        expect(service.getSelection()).toContain(mockEntity2);
    });

    test('toggleSelection should add or remove entity', () => {
        service.toggleSelection(mockEntity1);
        expect(service.getSelection()).toContain(mockEntity1);

        service.toggleSelection(mockEntity1);
        expect(service.getSelection()).not.toContain(mockEntity1);
    });

    test('clearSelection should remove all entities', () => {
        service.select(mockEntity1);
        service.select(mockEntity2, false);
        service.clearSelection();
        expect(service.getSelection()).toHaveLength(0);
    });

    test('translateSelection should update entity origins', () => {
        service.select(mockEntity1);
        service.translateSelection([10, 0, -5]);

        expect(mockEntity1.properties.origin).toBe('10 0 -5');
    });

    test('should emit selectionChanged event', (done) => {
        service.on('selectionChanged', (selection) => {
            expect(selection).toEqual([mockEntity1]);
            done();
        });
        service.select(mockEntity1);
    });
});
