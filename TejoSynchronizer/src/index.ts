import { ConnectionFactories } from './ConnectionFactoriesStore';
import { MessageParser, Parser } from './MessageParser';
import { SynchronizerFactories } from './SynchronizerFactoriesStore';
import { Class, Message, Messenger, ResourceSynchronizer } from './types';

export const registerMessengerFactory = (url: URL, f: (...args: any[]) => Messenger<any>) =>
  ConnectionFactories.register(url, f);
export const registerSynchronizerFactory = (url: URL, f: (...args: any[]) => ResourceSynchronizer<any, any>) =>
  SynchronizerFactories.register(url, f);
export const registerMessageParser = function <ST extends Message, TT extends Message>(
  sourceType: Class<ST>,
  targetType: Class<TT>,
  f: Parser<ST, TT>,
) {
  MessageParser.register(sourceType, targetType, f);
};

export default class TejoSynchronizer {
  private static instance: TejoSynchronizer;

  private static getInstance() {
    if (!this.instance) this.instance = new TejoSynchronizer();

    return this.instance;
  }

  private synchronizers: Map<URL, ResourceSynchronizer<any, any>>;

  private constructor() {
    this.synchronizers = new Map();
  }

  /**
   * @param resourceProtocol the resource protocol
   * @param constructorArgs the arguments used for creating the synchronizer (if it does not yet exist)
   * @returns an existing synchronizer or a new one
   */
  static getSynchronizer(resourceProtocol: URL, ...constructorArgs: any[]): ResourceSynchronizer<any, any> {
    let sync = this.getInstance().synchronizers.get(resourceProtocol);

    if (!sync) {
      sync = SynchronizerFactories.create(resourceProtocol, ...constructorArgs);
      this.getInstance().synchronizers.set(resourceProtocol, sync);
    }

    return sync;
  }
}
