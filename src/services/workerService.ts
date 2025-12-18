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

interface WorkerInstance<T> {
  worker: Worker;
  api: Remote<T>;
}

class WorkerService {
  private pakWorkers: WorkerInstance<PakParserWorkerApi>[] = [];
  private assetWorkers: WorkerInstance<AssetProcessorWorkerApi>[] = [];
  private indexerWorker: WorkerInstance<IndexerApi> | null = null;
  private poolSize = 4;
  private currentPakWorkerIndex = 0;
  private currentAssetWorkerIndex = 0;

  constructor(poolSize: number = 4) {
      this.poolSize = poolSize;
  }

  // Helper to get or create a worker
  private getWorkerInstance<T>(
      pool: WorkerInstance<T>[],
      index: number,
      WorkerClass: new () => Worker
  ): WorkerInstance<T> {
      if (pool.length < this.poolSize) {
          const worker = new WorkerClass();
          const api = wrap<T>(worker);
          const instance = { worker, api };
          pool.push(instance);
          return instance;
      }
      return pool[index];
  }

  async executePakParserTask<T>(
      task: (api: Remote<PakParserWorkerApi>) => Promise<T>,
      timeoutMs: number = 30000
  ): Promise<T> {
      const index = this.currentPakWorkerIndex;
      this.currentPakWorkerIndex = (this.currentPakWorkerIndex + 1) % this.poolSize;

      const instance = this.getWorkerInstance(this.pakWorkers, index, PakParserWorker);

      return this.runWithTimeout(instance, task, timeoutMs, () => {
          this.terminatePakWorker(index);
      });
  }

  async executeAssetProcessorTask<T>(
      task: (api: Remote<AssetProcessorWorkerApi>) => Promise<T>,
      timeoutMs: number = 30000
  ): Promise<T> {
      const index = this.currentAssetWorkerIndex;
      this.currentAssetWorkerIndex = (this.currentAssetWorkerIndex + 1) % this.poolSize;

      const instance = this.getWorkerInstance(this.assetWorkers, index, AssetProcessorWorker);

      return this.runWithTimeout(instance, task, timeoutMs, () => {
          this.terminateAssetWorker(index);
      });
  }

  async executeIndexerTask<T>(
      task: (api: Remote<IndexerApi>) => Promise<T>,
      timeoutMs: number = 30000
  ): Promise<T> {
      if (!this.indexerWorker) {
          const worker = new IndexerWorker();
          const api = wrap<IndexerApi>(worker);
          this.indexerWorker = { worker, api };
      }

      return this.runWithTimeout(this.indexerWorker, task, timeoutMs, () => {
          this.terminateIndexerWorker();
      });
  }

  private async runWithTimeout<T, A>(
      instance: WorkerInstance<A>,
      task: (api: Remote<A>) => Promise<T>,
      timeoutMs: number,
      onTimeout: () => void
  ): Promise<T> {
      let timer: ReturnType<typeof setTimeout>;

      const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
              onTimeout();
              reject(new Error(`Worker task timed out after ${timeoutMs}ms`));
          }, timeoutMs);
      });

      try {
          const result = await Promise.race([task(instance.api), timeoutPromise]);
          clearTimeout(timer!);
          return result;
      } catch (error) {
          clearTimeout(timer!);
          // If the error was a timeout, the cleanup is already handled in the timeout callback logic?
          // No, onTimeout is called inside the setTimeout.
          // But if task fails (e.g. worker error), we just throw.
          throw error;
      }
  }

  private terminatePakWorker(index: number) {
      if (this.pakWorkers[index]) {
          this.pakWorkers[index].worker.terminate();
          // Replace with new worker
          const worker = new PakParserWorker();
          const api = wrap<PakParserWorkerApi>(worker);
          this.pakWorkers[index] = { worker, api };
      }
  }

  private terminateAssetWorker(index: number) {
      if (this.assetWorkers[index]) {
          this.assetWorkers[index].worker.terminate();
          const worker = new AssetProcessorWorker();
          const api = wrap<AssetProcessorWorkerApi>(worker);
          this.assetWorkers[index] = { worker, api };
      }
  }

  private terminateIndexerWorker() {
      if (this.indexerWorker) {
          this.indexerWorker.worker.terminate();
          this.indexerWorker = null;
      }
  }

  // Deprecated/Legacy accessors
  getPakParser(): Remote<PakParserWorkerApi> {
      const index = this.currentPakWorkerIndex;
      this.currentPakWorkerIndex = (this.currentPakWorkerIndex + 1) % this.poolSize;
      return this.getWorkerInstance(this.pakWorkers, index, PakParserWorker).api;
  }

  getAssetProcessor(): Remote<AssetProcessorWorkerApi> {
      const index = this.currentAssetWorkerIndex;
      this.currentAssetWorkerIndex = (this.currentAssetWorkerIndex + 1) % this.poolSize;
      return this.getWorkerInstance(this.assetWorkers, index, AssetProcessorWorker).api;
  }

  getIndexer(): Remote<IndexerApi> {
      if (!this.indexerWorker) {
          const worker = new IndexerWorker();
          const api = wrap<IndexerApi>(worker);
          this.indexerWorker = { worker, api };
      }
      return this.indexerWorker.api;
  }
}

export const workerService = new WorkerService();
