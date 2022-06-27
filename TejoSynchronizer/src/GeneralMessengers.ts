import EventEmitter from 'events';
import { Class, Message, Messenger } from './types';

const DEBUG = false;

/**
 * Simply emits messages
 */
export class SimpleMessenger<T> extends Messenger<any> {
  MESSAGE_TYPE: Class<T>;

  constructor(messageType: Class<T>) {
    super(true);
    this.MESSAGE_TYPE = messageType;
  }

  send(message: Message, ...args: any[]): void {
    if (DEBUG) console.log(`sending message ${message}`);

    this.emit('message', message, ...args);
  }
  disconnect(): void {
    throw new Error('Method not implemented.');
  }
  connect(reInit: any): void {
    throw new Error('Method not implemented.');
  }
}

export class GroupMessenger<T extends Message> extends Messenger<any> {
  MESSAGE_TYPE: Class<Message>;

  private messengers: Set<Messenger<T>>;

  constructor(messageType: Class<T>, messengers: Set<Messenger<T>> = new Set()) {
    super(true);
    this.messengers = messengers;
    this.MESSAGE_TYPE = messageType;
  }

  addMessenger(messenger: Messenger<T>) {
    if (DEBUG) console.log(`adding messenger ${messenger}`);

    this.messengers.add(messenger);
  }

  removeMessenger(messenger: Messenger<T>) {
    if (DEBUG) console.log(`removing messenger ${messenger}`);

    if (this.messengers.has(messenger)) this.messengers.delete(messenger);
  }

  send(message: T): void {
    if (DEBUG) console.log(`sending message ${message}`);

    this.messengers.forEach((messenger) => messenger.send(message));
  }

  disconnect(): void {
    throw new Error('Method not implemented.'); // not necessary, will never happen
  }
  connect(reInit: any): void {
    throw new Error('Method not implemented.'); // not necessary, will never happen
  }
}

export class SwitchMessenger<T extends Message> extends Messenger<T> {
  MESSAGE_TYPE: Class<T>;

  private messengers: Map<string, Messenger<any>>;

  constructor(messengers: Iterable<readonly [string, Messenger<any>]> = [], messageType: Class<T>) {
    super(true);
    this.MESSAGE_TYPE = messageType;
    this.messengers = new Map(messengers);

    this.emit('connected');
    this.connected = true;
  }

  setMessenger(identifier: string, messenger: Messenger<T>) {
    this.messengers.set(identifier, messenger);

    messenger.on('message', (message, ...args: any[]) => this.emit('message', message, identifier, ...args)); // forward messages
  }

  removeMessenger(identifier: string): Messenger<T> | undefined {
    const temp = this.messengers.get(identifier);

    this.messengers.delete(identifier);

    return temp;
  }

  getMessenger(identifier: string): Messenger<T> | undefined {
    return this.messengers.get(identifier);
  }

  send(message: Message, toMessenger: string, ...args: any[]): void {
    const targetMessenger = toMessenger && this.messengers.get(toMessenger);

    if (targetMessenger)
      // switch
      targetMessenger.send(message, ...args);
    // flood
    else this.messengers.forEach((messenger: Messenger<any>) => messenger.send(message, ...args));
  }

  disconnect(): void {
    throw new Error('Method not implemented.');
  }
  connect(reInit: any): void {
    throw new Error('Method not implemented.');
  }
}

/**
 * Forwards all events an emitter to the other
 * @param emitter the original emitter
 * @param forwardEmitter the emitter to forward the events to
 */
export function forwardEmitter(emitter: EventEmitter, forwardEmitter: EventEmitter) {
  // save original .emit method
  const oldEmitter = emitter.emit;

  // assign override
  emitter.emit = function (eventName: string | symbol, ...args: any[]) {
    // allow the event to be normally emitted
    oldEmitter.apply(emitter, [eventName, ...args]);

    // then forward it to the forwardEmitter
    return forwardEmitter.emit.apply(forwardEmitter, [eventName, ...args]);
  };
}
