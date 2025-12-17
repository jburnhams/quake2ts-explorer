import { PakArchive } from 'quake2ts/engine';

// This class mimics PakArchive but is constructed from pre-parsed data
// @ts-ignore - We are knowingly implementing a class with private members
export class WorkerPakArchive implements PakArchive {
    name: string;
    entries: Map<string, any>;
    // @ts-ignore
    private buffer: ArrayBuffer;
    size: number;
    checksum: number;

    constructor(name: string, buffer: ArrayBuffer, entries: Map<string, any>) {
        this.name = name;
        this.buffer = buffer;
        this.entries = entries;
        this.size = buffer.byteLength;
        this.checksum = 0;
    }

    readFile(path: string): Uint8Array {
        const entry = this.entries.get(path);
        if (!entry) {
            throw new Error(`File not found: ${path}`);
        }
        return new Uint8Array(this.buffer, entry.offset, entry.length);
    }

    list(): string[] {
        return Array.from(this.entries.keys());
    }

    has(path: string): boolean {
        return this.entries.has(path);
    }

    getEntries(): any[] {
        return Array.from(this.entries.entries()).map(([name, entry]) => ({
            name,
            length: entry.length, // PakDirectoryEntry expects length
            offset: entry.offset
        }));
    }

    getEntry(path: string): any {
         return this.entries.get(path);
    }

    listEntries(): any[] {
        return this.getEntries();
    }

    validate(): any {
        return { isValid: true, errors: [] };
    }

    static fromArrayBuffer(name: string, buffer: ArrayBuffer): WorkerPakArchive {
        throw new Error("Use worker to create");
    }
}
