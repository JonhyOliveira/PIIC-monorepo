import { ResourceSynchronizer } from './types';

export class SynchronizerFactories {
  private static instance: SynchronizerFactories;

  private static getInstance() {
    if (!this.instance) this.instance = new SynchronizerFactories();

    return this.instance;
  }

  private factories: Map<string, (...args: any[]) => ResourceSynchronizer<any, any>> = new Map();

  public static register(url: URL, factory: (...args: any[]) => ResourceSynchronizer<any, any>) {
    const instance = SynchronizerFactories.getInstance();

    if (!instance.factories.has(url.protocol)) {
      instance.factories.set(url.protocol, factory);
    }
  }

  public static create(url: URL, ...args: any[]): ResourceSynchronizer<any, any> {
    const factoryMethod = SynchronizerFactories.getInstance().factories.get(url.protocol);

    if (factoryMethod) return factoryMethod(...args);
    else throw new Error('No factory method found for: ' + url.protocol);
  }
}
