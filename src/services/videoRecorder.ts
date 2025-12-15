export interface VideoRecordOptions {
  mimeType?: string;
  fps?: number;
  videoBitsPerSecond?: number;
  width?: number;
  height?: number;
  timeLimit?: number; // In seconds, 0 for unlimited
  audio?: boolean;
}

export class VideoRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private isRecordingState: boolean = false;

  public startRecording(canvas: HTMLCanvasElement, options: VideoRecordOptions = {}): void {
    if (this.isRecordingState) {
      console.warn('Already recording');
      return;
    }

    // Default options
    const mimeType = options.mimeType || 'video/webm;codecs=vp9';
    const fps = options.fps || 30;
    const videoBitsPerSecond = options.videoBitsPerSecond || 2500000; // 2.5 Mbps default

    try {
      // Use captureStream if available
      const stream = canvas.captureStream(fps);

      // Add audio track if requested (placeholder - requires audio context integration)
      if (options.audio) {
          // TODO: Implement audio track capture from AudioContext
          console.warn("Audio recording requested but not yet implemented.");
      }

      // Check if mimeType is supported
      let selectedMimeType = mimeType;
      if (!MediaRecorder.isTypeSupported(mimeType)) {
          console.warn(`Mime type ${mimeType} not supported, falling back to video/webm`);
          selectedMimeType = 'video/webm';
      }

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond
      });

      this.chunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Request data every 100ms for smoother saving
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
