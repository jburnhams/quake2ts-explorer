import { WorkerPakArchive } from '@/src/utils/WorkerPakArchive';


describe('WorkerPakArchive', () => {
    const mockBuffer = new ArrayBuffer(100);
    const mockEntries = new Map<string, any>();
    mockEntries.set('file1.txt', { offset: 0, length: 10 });
    mockEntries.set('dir/file2.txt', { offset: 10, length: 20 });

    it('should construct correctly', () => {
        const archive = new WorkerPakArchive('test.pak', mockBuffer, mockEntries);
        expect(archive.name).toBe('test.pak');
        expect(archive.size).toBe(100);
        expect((archive as any).entries).toBe(mockEntries);
    });

    it('should read file content', () => {
        const archive = new WorkerPakArchive('test.pak', mockBuffer, mockEntries);
        const data = archive.readFile('file1.txt');
        expect(data).toBeInstanceOf(Uint8Array);
        expect(data.length).toBe(10);
        expect(data.byteOffset).toBe(0);
    });

    it('should throw when reading non-existent file', () => {
        const archive = new WorkerPakArchive('test.pak', mockBuffer, mockEntries);
        expect(() => archive.readFile('missing.txt')).toThrow('File not found: missing.txt');
    });

    it('should list file paths', () => {
        const archive = new WorkerPakArchive('test.pak', mockBuffer, mockEntries);
        const list = archive.list();
        expect(list).toContain('file1.txt');
        expect(list).toContain('dir/file2.txt');
        expect(list.length).toBe(2);
    });

    it('should check if file exists', () => {
        const archive = new WorkerPakArchive('test.pak', mockBuffer, mockEntries);
        expect(archive.has('file1.txt')).toBe(true);
        expect(archive.has('missing.txt')).toBe(false);
    });

    it('should get entries with metadata', () => {
        const archive = new WorkerPakArchive('test.pak', mockBuffer, mockEntries);
        const entries = archive.getEntries();
        expect(entries.length).toBe(2);

        const file1 = entries.find(e => e.name === 'file1.txt');
        expect(file1).toBeDefined();
        expect(file1.length).toBe(10);
        expect(file1.offset).toBe(0);
    });

    it('should get single entry', () => {
        const archive = new WorkerPakArchive('test.pak', mockBuffer, mockEntries);
        const entry = archive.getEntry('file1.txt');
        expect(entry).toBeDefined();
        expect(entry.length).toBe(10);
    });

    it('should list entries (alias)', () => {
        const archive = new WorkerPakArchive('test.pak', mockBuffer, mockEntries);
        const entries = archive.listEntries();
        expect(entries.length).toBe(2);
    });

    it('should validate (dummy)', () => {
        const archive = new WorkerPakArchive('test.pak', mockBuffer, mockEntries);
        expect(archive.validate()).toEqual({ isValid: true, errors: [] });
    });

    it('should throw on static fromArrayBuffer', () => {
        expect(() => WorkerPakArchive.fromArrayBuffer('test', mockBuffer)).toThrow("Use worker to create");
    });
});
