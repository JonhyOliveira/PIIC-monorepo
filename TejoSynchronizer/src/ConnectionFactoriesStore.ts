import { Messenger } from './types';

export class ConnectionFactories {
  private static instance: ConnectionFactories;

  private static getInstance() {
    if (!this.instance) this.instance = new ConnectionFactories();

    return this.instance;
  }

  private factories: Map<string, (...args: any[]) => Messenger<any>> = new Map();

  public static register<T extends Messenger<any>>(url: URL, factory: (...args: any[]) => T) {
    ConnectionFactories.getInstance().factories.set(url.protocol, factory);
  }

  public static create(url: URL, ...args: any[]): Messenger<any> {
    const factoryMethod = ConnectionFactories.getInstance().factories.get(url.protocol);

    if (factoryMethod) return factoryMethod(...args);
    else throw new Error('No factory method found for: ' + url.protocol);
  }
}

// console.log(ConnectionFactories.getInstance() == SynchronizerFactories.getInstance()) -> false :)
