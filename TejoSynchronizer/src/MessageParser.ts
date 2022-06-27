import { Class, Message, Messenger } from './types';

const DEBUG = false;

export type Parser<ST extends Message, TT extends Message> = (Message: ST) => TT;

export class MessageParser {
  private static instance: MessageParser;

  private static getInstance(): MessageParser {
    if (!this.instance) this.instance = new MessageParser();

    return this.instance;
  }

  /**
   * sourceType -> list of entries containing a targetType and the function that converts a message in sourceType to targetType
   */
  private parsers: Map<string, Map<string, Parser<any, any> | undefined>>;

  private constructor() {
    this.parsers = new Map();
  }

  /**
   * Registers a parser function
   * @param sourceType the type of the provided message
   * @param targetType the type of message produced by the function
   * @param fun converts a message from sourceType to a message of type targetType
   */
  public static register<ST extends Message, TT extends Message>(
    sourceType: Class<ST>,
    targetType: Class<TT>,
    func: Parser<ST, TT> | undefined,
  ): void {
    const instance = MessageParser.getInstance();

    let sourceParsers = instance.parsers.get(sourceType.name);

    if (!sourceParsers) {
      sourceParsers = new Map();
      instance.parsers.set(sourceType.name, sourceParsers);
    }

    sourceParsers.set(targetType.name, func);
    if (DEBUG) console.log(`Registered message parser for ${sourceType.name} -> ${targetType.name}`);
  }

  /**
   * Converts a message to a target message type
   * @param message the message to convert
   * @param targetType the type to convert to (make sure this was the type you registered)
   * @returns the converted message
   */
  public static convert<ST extends Message, TT extends Message>(message: ST, targetType: Class<TT>): TT {
    if (message.TYPE instanceof targetType)
      // || targetType instanceof message.TYPE)
      return message as unknown as TT;

    if (DEBUG) {
      console.log('parsing message');
      console.log(message);
      console.log(`from ${message.TYPE.name} to ${targetType.name}`);
    }

    const parser = MessageParser.getInstance().parsers.get(message.TYPE.name)?.get(targetType.name);

    if (!parser) throw new Error(`No parser to convert [${message.TYPE.name} -> ${targetType.name}]`);

    const m = parser(message);
    if (m) return m as TT;
    else throw new Error(`Parsing error [${message.TYPE.name} -> ${targetType.name}]. Unspecified error parsing:`);
  }
}

export class ParsingMessenger<mT extends Message, sT extends Message> extends Messenger<any> {
  MESSAGE_TYPE: Class<mT>;

  readonly targetMessenger: Messenger<mT>;
  private senderMessageType: Class<sT>;

  constructor(targetMessenger: Messenger<mT>, senderMessageType: Class<sT>) {
    super(targetMessenger.reconnect);
    this.MESSAGE_TYPE = targetMessenger.MESSAGE_TYPE;
    this.targetMessenger = targetMessenger;
    this.senderMessageType = senderMessageType;

    targetMessenger.on('message', (message: mT, ...args) => {
      this.emit('message', MessageParser.convert(message, this.senderMessageType), ...args);
    });
  }

  send(message: sT, ...args: any[]): void {
    this.targetMessenger.send(MessageParser.convert(message, this.MESSAGE_TYPE), ...args);
  }
  disconnect(): void {
    this.targetMessenger.disconnect();
  }
  connect(reInit: any): void {
    this.targetMessenger.connect(reInit);
  }
}

/* TEST
import { LegionMessage, LegionSync } from "./LegionSynchronizer"
import { BraidMessage } from "./BraidMessenger"

let parser = MessageParser.getInstance()
parser.register(LegionMessage, BraidMessage, (message: LegionMessage) => {
    let merge_type = message.objectType + ":" + message.objectID

    if (message instanceof LegionSync)
        return new BraidMessage(merge_type, message.from, "", [message.version], JSON.stringify(message.delta), [])

    return undefined
})

parser.register(BraidMessage, LegionMessage, (message: BraidMessage) => {
    let content = JSON.parse(message.body)
    let [objectType, objectID] = message.mergeType.split(":")

    if (content.delta)  // LegionSync
        return new LegionSync(objectID, objectType, message.peer, message.parents, content)

    return undefined
})

let original_message = new LegionSync("testObject", "testType", "testPeer", "versaoTOP", { delta: "d", vv: "vv", m: "m" })
console.log(original_message)

let converted_message = parser.convert(original_message, BraidMessage)
console.log(converted_message)

let reverted_message = parser.convert(converted_message, original_message.TYPE)
console.log(reverted_message) */
