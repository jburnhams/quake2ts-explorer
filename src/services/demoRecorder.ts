// src/services/demoRecorder.ts
import { DemoRecorder as EngineDemoRecorder } from 'quake2ts/engine';
import { demoStorageService } from './demoStorageService';

class DemoRecorderService {
  private recorder: EngineDemoRecorder | null = null;
  private static instance: DemoRecorderService;
  private currentFilename: string = '';
  private autoSave: boolean = true; // Default to auto-save to storage

  private constructor() {}

  public static getInstance(): DemoRecorderService {
    if (!DemoRecorderService.instance) {
      DemoRecorderService.instance = new DemoRecorderService();
    }
    return DemoRecorderService.instance;
  }

  public startRecording(filename: string): void {
    if (this.isRecording()) {
      console.warn('Already recording demo');
      return;
    }

    this.currentFilename = filename;
    this.recorder = new EngineDemoRecorder();
    this.recorder.startRecording(filename, performance.now());
    console.log(`Started recording demo: ${filename}`);
  }

  public async stopRecording(): Promise<Uint8Array | null> {
    if (!this.recorder) {
      console.warn('Not recording');
      return null;
    }

    const data = this.recorder.stopRecording();
    const filename = this.currentFilename;
    this.recorder = null;
    this.currentFilename = '';

    if (this.autoSave && data) {
      try {
        await demoStorageService.saveDemo(filename, data);
        console.log(`Saved demo ${filename} to storage (${data.length} bytes)`);
      } catch (err) {
        console.error('Failed to auto-save demo:', err);
      }
    }

    return data;
  }

  public isRecording(): boolean {
    return this.recorder ? this.recorder.getIsRecording() : false;
  }

  public recordMessage(data: Uint8Array): void {
    if (this.recorder && this.isRecording()) {
      this.recorder.recordMessage(data);
    }
  }

  public setAutoSave(enabled: boolean): void {
    this.autoSave = enabled;
  }
}

export const demoRecorderService = DemoRecorderService.getInstance();
