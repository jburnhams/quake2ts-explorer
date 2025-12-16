import {
  type PmoveTraceFn,
  type PmovePointContentsFn,
  type UserCommand,
  type PmoveState,
  type PmoveTraceResult,
  Vec3
} from 'quake2ts/shared';

import {
  ClientPrediction,
  type PredictionState,
  type PredictionSettings
} from 'quake2ts/client';

export interface PredictionServiceConfig {
  trace: PmoveTraceFn;
  pointContents: PmovePointContentsFn;
  settings?: Partial<PredictionSettings>;
}

class PredictionService {
  private predictor: ClientPrediction | null = null;
  private mispredictionCount: number = 0;
  private config: PredictionServiceConfig | null = null;
  private readonly ERROR_THRESHOLD = 0.1; // Tolerance for counting as misprediction

  public init(config: PredictionServiceConfig): void {
    this.config = config;
    this.predictor = new ClientPrediction(
      config.trace,
      config.pointContents,
      config.settings
    );
    this.mispredictionCount = 0;
  }

  public setEnabled(enabled: boolean): void {
    if (this.predictor) {
      this.predictor.setPredictionEnabled(enabled);
    }
  }

  public predict(cmd: UserCommand): PredictionState {
    if (!this.predictor) {
        throw new Error("PredictionService not initialized");
    }

    // Process the new command and return predicted state
    return this.predictor.enqueueCommand(cmd);
  }

  /**
   * Called when a new snapshot arrives from the server.
   * This updates the authoritative state base for prediction.
   */
  public onServerFrame(
    serverState: PredictionState,
    sequence: number, // Typically part of player state or separate
    serverTime: number
  ): void {
      if (!this.predictor) return;

      const frameResult = {
          state: serverState,
          time: serverTime,
          deltaMs: 0
      };

      // Apply authoritative state
      // The library's setAuthoritative usually calculates the error between
      // predicted state at that time and the actual server state.
      this.predictor.setAuthoritative(frameResult as any);

      // Check if this caused a significant error
      const error = this.predictor.getPredictionError();
      const magnitude = Math.sqrt(error.x*error.x + error.y*error.y + error.z*error.z);

      if (magnitude > this.ERROR_THRESHOLD) {
          this.mispredictionCount++;
      }
  }

  public getPredictionError(): Vec3 {
    if (!this.predictor) return { x: 0, y: 0, z: 0 };
    return this.predictor.getPredictionError();
  }

  public decayError(frametime: number): void {
    if (this.predictor) {
        this.predictor.decayError(frametime);
    }
  }

  public getPredictedState(): PredictionState | null {
      return this.predictor ? this.predictor.getPredictedState() : null;
  }

  public getMispredictionCount(): number {
      return this.mispredictionCount;
  }
}

export const predictionService = new PredictionService();
