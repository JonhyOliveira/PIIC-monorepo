import EventEmitter from 'events';

/**
 * Produces event "update" when the resource is updated
 */
export abstract class ResourceSynchronizer<resourceT, messageT extends Message> extends EventEmitter {
  /**
   * The type of messages produced by this synchronizer
   */
  abstract readonly MESSAGE_TYPE: Class<messageT>;

  /**
   * The underlying synchronized resource
   */
  resource: resourceT;

  protected syncing: boolean;

  constructor(resource: resourceT) {
    super();
    this.resource = resource;
    this.syncing = false;
  }

  /**
   * Starts syncing
   * @returns false if already syncing, true otherwise
   */
  abstract sync(): Promise<boolean>;
}

/**
 * Produces the following events:
 * - message[message, ...args]: when a new message arrives
 * - disconnected: when the messenger loses connection
 * - connected: when the messegenger establishes connection
 */
export abstract class Messenger<T extends Message> extends EventEmitter {
  /**
   * The type of messages sent by this messenger
   */
  abstract readonly MESSAGE_TYPE: Class<T>;

  connected: boolean;
  reconnect: boolean;

  constructor(reconnect: boolean) {
    super();
    this.reconnect = reconnect;
    this.connected = false;
  }

  /**
   * Sends a message to the network
   * @param message the message to send
   * @param args additional arguments passed to the messenger
   */
  abstract send(message: T, ...args: any[]): void;

  /**
   * Disconnect the messenger
   */
  abstract disconnect(): void;

  /**
   * Reconnects the messenger
   */
  abstract connect(reInit: any): void;
}

export abstract class Message {
  abstract readonly TYPE: Class<any>;
}

export type Class<T> = abstract new (...args: any[]) => T | (abstract new (...args: any[]) => T);
