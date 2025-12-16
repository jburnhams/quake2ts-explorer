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
  private pakParserWorker: Remote<PakParserWorkerApi> | null = null;

  getPakParser(): Remote<PakParserWorkerApi> {
    if (!this.pakParserWorker) {
      const worker = new PakParserWorker();
      this.pakParserWorker = wrap<PakParserWorkerApi>(worker);
    }
    return this.pakParserWorker;
  }
}

export const workerService = new WorkerService();
