// src/services/demoRecorder.ts
import { DemoRecorder as EngineDemoRecorder } from 'quake2ts/engine';

class DemoRecorderService {
  private recorder: EngineDemoRecorder | null = null;
  private static instance: DemoRecorderService;

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

    // We instantiate the recorder from quake2ts/engine
    this.recorder = new EngineDemoRecorder();
    this.recorder.startRecording(filename, performance.now());
  }

  public stopRecording(): Uint8Array | null {
    if (!this.recorder) {
      console.warn('Not recording');
      return null;
    }
    const data = this.recorder.stopRecording();
    this.recorder = null;
    return data;
  }

  public isRecording(): boolean {
    return this.recorder ? this.recorder.getIsRecording() : false;
  }

  // This should be called by the game loop or network layer when a message is received/generated
  public recordMessage(data: Uint8Array): void {
    if (this.recorder && this.isRecording()) {
      this.recorder.recordMessage(data);
    }
  }
}

export const demoRecorderService = DemoRecorderService.getInstance();
