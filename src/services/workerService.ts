import { wrap, Remote } from 'comlink';
import PakParserWorker from '../workers/pakParser.worker?worker';
import AssetProcessorWorker from '../workers/assetProcessor.worker?worker';

export interface ParseResult {
  entries: Map<string, any>;
  buffer: ArrayBuffer;
  name: string;
}

// Define the interface of the worker
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

class WorkerService {
  private workers: Remote<PakParserWorkerApi>[] = [];
  private assetProcessors: Remote<AssetProcessorWorkerApi>[] = [];
  private poolSize = 4;
  private currentWorkerIndex = 0;
  private currentAssetWorkerIndex = 0;

  constructor(poolSize: number = 4) {
      this.poolSize = poolSize;
  }

  getPakParser(): Remote<PakParserWorkerApi> {
    // Lazy initialization
    if (this.workers.length < this.poolSize) {
        const worker = new PakParserWorker();
        const api = wrap<PakParserWorkerApi>(worker);
        this.workers.push(api);
        return api;
    }

    // Round-robin selection
    const worker = this.workers[this.currentWorkerIndex];
    this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.poolSize;
    return worker;
  }

  getAssetProcessor(): Remote<AssetProcessorWorkerApi> {
    // Lazy initialization
    if (this.assetProcessors.length < this.poolSize) {
        const worker = new AssetProcessorWorker();
        const api = wrap<AssetProcessorWorkerApi>(worker);
        this.assetProcessors.push(api);
        return api;
    }

    // Round-robin selection
    const worker = this.assetProcessors[this.currentAssetWorkerIndex];
    this.currentAssetWorkerIndex = (this.currentAssetWorkerIndex + 1) % this.poolSize;
    return worker;
  }
}

export const workerService = new WorkerService();
