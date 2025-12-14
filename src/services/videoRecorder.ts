export interface RecordOptions {
  mimeType?: string;
  fps?: number;
  videoBitsPerSecond?: number;
}

export class VideoRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private isRecordingState: boolean = false;

  public startRecording(canvas: HTMLCanvasElement, options: RecordOptions = {}): void {
    if (this.isRecordingState) {
      console.warn('Already recording');
      return;
    }

    const mimeType = options.mimeType || 'video/webm;codecs=vp9';
    const fps = options.fps || 60;
    const videoBitsPerSecond = options.videoBitsPerSecond || 5000000; // 5 Mbps default

    try {
      // Use captureStream if available
      const stream = canvas.captureStream(fps);

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond
      });

      this.chunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.isRecordingState = true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecordingState) {
        reject(new Error('No active recording to stop'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder?.mimeType || 'video/webm' });
        this.chunks = [];
        this.mediaRecorder = null;
        this.isRecordingState = false;
        resolve(blob);
      };

      this.mediaRecorder.onerror = (event: Event) => {
         reject(new Error(`MediaRecorder error: ${(event as any).error}`));
      };

      this.mediaRecorder.stop();
    });
  }

  public forceStop(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
       try {
         this.mediaRecorder.stop();
       } catch (e) {
         // Ignore
       }
    }
    this.mediaRecorder = null;
    this.chunks = [];
    this.isRecordingState = false;
  }

  public isRecording(): boolean {
    return this.isRecordingState;
  }
}

export const videoRecorderService = new VideoRecorderService();
