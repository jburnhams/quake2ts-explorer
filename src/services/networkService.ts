import {
  NetChan,
  BinaryStream,
  BinaryWriter,
  ServerCommand,
  ClientCommand,
  UserCommand,
  writeUserCommand,
  MAX_MSGLEN,
  PlayerState,
  EntityState
} from 'quake2ts/shared';

// Define types not directly exported or needing adaptation
export interface GameStateSnapshot {
  time: number;
  playerState: PlayerState;
  entities: EntityState[];
  // events: GameEvent[]; // TODO: Add events parsing
}

export type NetworkState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface NetworkCallbacks {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onSnapshot?: (snapshot: GameStateSnapshot) => void;
  onServerCommand?: (cmd: ServerCommand, stream: BinaryStream) => void;
  onConfigString?: (index: number, value: string) => void;
  onPrint?: (level: number, text: string) => void;
  onCenterPrint?: (text: string) => void;
  onStuffText?: (text: string) => void;
}

class NetworkService {
  private ws: WebSocket | null = null;
  private netchan: NetChan;
  private state: NetworkState = 'disconnected';
  private callbacks: NetworkCallbacks = {};
  private qport: number;
  private serverTime: number = 0;
  private lastMessageTime: number = 0;

  // Queue for messages when disconnected
  private messageQueue: Uint8Array[] = [];
  private lastSendTime: number = 0;
  private readonly SEND_RATE = 1000 / 60; // Max 60 packets per second

  constructor() {
    this.netchan = new NetChan();
    this.qport = Math.floor(Math.random() * 65536);
  }

  public getQport(): number {
    return this.qport;
  }

  public setCallbacks(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
  }

  public getState(): NetworkState {
    return this.state;
  }

  public async connect(url: string, maxRetries = 3): Promise<void> {
    if (this.state !== 'disconnected' && this.state !== 'error') {
      this.disconnect('Reconnecting');
    }

    this.state = 'connecting';
    this.netchan.setup(this.qport);

    // Reset state
    this.serverTime = 0;
    this.lastMessageTime = performance.now();
    this.messageQueue = [];

    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        await this.attemptConnection(url);
        return; // Success
      } catch (e) {
        attempt++;
        if (attempt > maxRetries) {
          this.state = 'error';
          const error = e instanceof Error ? e : new Error('Connection failed');
          this.callbacks.onError?.(error);
          throw error;
        }
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private attemptConnection(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          this.state = 'connected';
          this.callbacks.onConnect?.();

          // Send initial connection packet
          this.sendClientCommand(ClientCommand.userinfo, `\\name\\Player\\fov\\90`);
          this.flushQueue();
          resolve();
        };

        this.ws.onclose = (event) => {
          if (this.state === 'connecting') {
            reject(new Error(event.reason || 'Connection failed'));
          } else {
            this.handleDisconnect(event.reason || 'Connection closed');
          }
        };

        this.ws.onerror = (event) => {
          // If connecting, the onclose will fire and we'll reject there or here.
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data as ArrayBuffer);
        };

      } catch (e) {
        reject(e);
      }
    });
  }

  public disconnect(reason: string = 'User disconnected'): void {
    if (this.ws) {
      // Avoid triggering onclose logic that might think it's an error if we are initiating it
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
    this.handleDisconnect(reason);
  }

  public sendCommand(cmd: UserCommand): void {
    // Throttling check
    const now = performance.now();
    if (now - this.lastSendTime < this.SEND_RATE) {
      return; // Skip this packet if we are sending too fast (basic client side throttling)
    }
    this.lastSendTime = now;

    const writer = new BinaryWriter(128);
    writer.writeByte(ClientCommand.move);
    writeUserCommand(writer, cmd);

    const packet = this.netchan.transmit(writer.getData());
    this.sendPacket(packet);
  }

  public sendClientCommand(cmd: ClientCommand, data?: string): void {
    this.netchan.writeReliableByte(cmd);
    if (data) {
      this.netchan.writeReliableString(data);
    }
    const packet = this.netchan.transmit();
    this.sendPacket(packet);
  }

  public async ping(address: string): Promise<number> {
      // Stub implementation for server browser ping
      // In a real implementation, we would send a connectionless packet via UDP/WebSocket wrapper
      // or try to connect and measure handshake time.
      // For now, we simulate a delay to satisfy the interface requirement.
      const start = performance.now();
      // Simulate network jitter
      const delay = 20 + Math.random() * 80;
      await new Promise(resolve => setTimeout(resolve, delay));
      return Math.round(delay);
  }

  private sendPacket(data: Uint8Array): void {
    if (this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.messageQueue.push(data);
    }
  }

  private flushQueue(): void {
    if (this.state !== 'connected' || !this.ws) return;

    while (this.messageQueue.length > 0) {
      const packet = this.messageQueue.shift();
      if (packet) {
        this.ws.send(packet);
      }
    }
  }

  private handleDisconnect(reason: string): void {
    if (this.state === 'disconnected') return;

    this.state = 'disconnected';
    this.netchan.reset();
    this.callbacks.onDisconnect?.(reason);
  }

  private handleMessage(data: ArrayBuffer): void {
    this.lastMessageTime = performance.now();

    const payload = this.netchan.process(new Uint8Array(data));

    if (payload) {
      this.parseServerMessage(payload);
    }
  }

  private parseServerMessage(data: Uint8Array): void {
    const stream = new BinaryStream(data);

    while (stream.hasMore()) {
      const cmd = stream.readByte() as ServerCommand;

      this.callbacks.onServerCommand?.(cmd, stream);

      switch (cmd) {
        case ServerCommand.nop:
          break;

        case ServerCommand.disconnect:
          this.disconnect('Server disconnected client');
          break;

        case ServerCommand.reconnect:
          // TODO: Handle reconnect
          break;

        case ServerCommand.print:
          if (stream.hasBytes(1)) {
            const level = stream.readByte();
            const text = stream.readString();
            this.callbacks.onPrint?.(level, text);
          }
          break;

        case ServerCommand.centerprint:
          const cpText = stream.readString();
          this.callbacks.onCenterPrint?.(cpText);
          break;

        case ServerCommand.stufftext:
          const stText = stream.readString();
          this.callbacks.onStuffText?.(stText);
          break;

        case ServerCommand.configstring:
          const csIndex = stream.readShort();
          const csValue = stream.readString();
          this.callbacks.onConfigString?.(csIndex, csValue);
          break;

        case ServerCommand.serverdata:
          // Protocol version, server count, etc.
          // Correctly read known Q2 fields to advance stream
          const protocol = stream.readLong();
          const serverCount = stream.readLong();
          const attractLoop = stream.readByte();
          const gameDir = stream.readString();
          // In standard Q2 there is playernum (short) or similar.
          // We read one more short just in case or stop here.
          // Assuming playerNum is usually next in handshake.
          if (stream.hasBytes(2)) {
             stream.readShort();
          }
          // We could expose these via callbacks if needed
          break;

        case ServerCommand.frame:
          // Parsing frame involves reading sequence, delta frame, etc.
          // Structure (from qcommon/msg.c or similar):
          // serverFrame (long)
          // deltaFrame (long)

          if (stream.hasBytes(8)) {
            const serverFrame = stream.readLong();
            const deltaFrame = stream.readLong();

            // Call snapshot callback with placeholder
            this.callbacks.onSnapshot?.({
               time: serverFrame,
               playerState: {} as any, // Placeholder
               entities: []
            });
          }

          // Frame is typically the main payload and variable length (packet entities).
          // We cannot parse further without full entity/bitpack logic.
          // Abort further parsing of this packet to prevent errors.
          return;

        default:
          // Unknown command. Abort to prevent stream desync.
          return;
      }
    }
  }
}

export const networkService = new NetworkService();
