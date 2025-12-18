import { wrap, Remote } from 'comlink';
import PakParserWorker from '../workers/pakParser.worker?worker';

export interface ParseResult {
  entries: Map<string, any>;
  buffer: ArrayBuffer;
  name: string;
}

// Define the interface of the worker
interface PakParserWorkerApi {
  parsePak(name: string, buffer: ArrayBuffer): Promise<ParseResult>;
}

class WorkerService {
  private workers: Remote<PakParserWorkerApi>[] = [];
  private poolSize = 4;
  private currentWorkerIndex = 0;

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
}

export const workerService = new WorkerService();
