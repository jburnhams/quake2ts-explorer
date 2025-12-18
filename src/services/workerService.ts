import { wrap, Remote } from 'comlink';
import PakParserWorker from '../workers/pakParser.worker?worker';
import AssetProcessorWorker from '../workers/assetProcessor.worker?worker';
import IndexerWorker from '../workers/indexer.worker?worker';

export interface ParseResult {
  entries: Map<string, any>;
  buffer: ArrayBuffer;
  name: string;
}

interface PakParserWorkerApi {
  parsePak(name: string, buffer: ArrayBuffer): Promise<ParseResult>;
}

export interface AssetProcessorWorkerApi {
  processPcx(buffer: ArrayBuffer): Promise<any>;
  processWal(buffer: ArrayBuffer, palette: Uint8Array | null): Promise<any>;
  processTga(buffer: ArrayBuffer): Promise<any>;
  processMd2(buffer: ArrayBuffer): Promise<any>;
  processMd3(buffer: ArrayBuffer): Promise<any>;
  processSp2(buffer: ArrayBuffer): Promise<any>;
  processWav(buffer: ArrayBuffer): Promise<any>;
  processBsp(buffer: ArrayBuffer): Promise<any>;
}

export interface FileReference {
  path: string;
  type: 'texture' | 'model' | 'sound' | 'other';
  context?: string;
}

export interface IndexerApi {
  analyzeBsp(buffer: ArrayBuffer): Promise<FileReference[]>;
  analyzeMd2(buffer: ArrayBuffer): Promise<FileReference[]>;
  analyzeMd3(buffer: ArrayBuffer): Promise<FileReference[]>;
  buildSearchIndex(paths: string[]): Promise<void>;
  searchFiles(query: string): Promise<string[]>;
}

class WorkerService {
  private workers: Remote<PakParserWorkerApi>[] = [];
  private assetProcessors: Remote<AssetProcessorWorkerApi>[] = [];
  private indexerWorker: Remote<IndexerApi> | null = null;
  private poolSize = 4;
  private currentWorkerIndex = 0;
  private currentAssetWorkerIndex = 0;

  constructor(poolSize: number = 4) {
      this.poolSize = poolSize;
  }

  getPakParser(): Remote<PakParserWorkerApi> {
    if (this.workers.length < this.poolSize) {
        const worker = new PakParserWorker();
        const api = wrap<PakParserWorkerApi>(worker);
        this.workers.push(api);
        return api;
    }

    const worker = this.workers[this.currentWorkerIndex];
    this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.poolSize;
    return worker;
  }

  getAssetProcessor(): Remote<AssetProcessorWorkerApi> {
    if (this.assetProcessors.length < this.poolSize) {
        const worker = new AssetProcessorWorker();
        const api = wrap<AssetProcessorWorkerApi>(worker);
        this.assetProcessors.push(api);
        return api;
    }

    const worker = this.assetProcessors[this.currentAssetWorkerIndex];
    this.currentAssetWorkerIndex = (this.currentAssetWorkerIndex + 1) % this.poolSize;
    return worker;
  }

  getIndexer(): Remote<IndexerApi> {
    if (!this.indexerWorker) {
        const worker = new IndexerWorker();
        this.indexerWorker = wrap<IndexerApi>(worker);
    }
    return this.indexerWorker;
  }
}

export const workerService = new WorkerService();
