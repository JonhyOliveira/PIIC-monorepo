import { ParsingMessenger } from "tejosynchronizer/lib/MessageParser";
import { Class, Message, Messenger, ResourceSynchronizer } from "tejosynchronizer/lib/types";
import { ConnectionFactories } from "tejosynchronizer/lib/ConnectionFactoriesStore"
import { CRDT } from "./crdt";
import { SimpleMessenger } from "tejosynchronizer/lib/GeneralMessengers";

const DEBUG = false

/**
 * General synchronizer for Legion's CRDTs
 */
export class LegionResourceSynchronizer extends ResourceSynchronizer<CRDT, LegionMessage> {

    MESSAGE_TYPE: Class<LegionMessage> = LegionMessage

    /**
     * Messages from the Legion Object Store should come from this messenger
     * These messages will be propagated outwards without
     */
    readonly objectStoreMessenger: Messenger<LegionMessage>

    readonly peer: string

    readonly externalMessenger: Messenger<any>

    private parsingMessenger: ParsingMessenger<any, LegionMessage>

    /**
     * Creates a CRDT synchronizer for Legion's CRDT
     * @param object the underlying object
     * @param internalMessenger the messenger used to receive internal messages from the store, 
     * these messages will not be used to sync the resource (as they already have been processed)
     * @param remoteSource URL for the remote connections to create
     */
    constructor(object: CRDT, internalMessenger: Messenger<LegionMessage>, remoteSource: URL | Messenger<any>) {
        super(object)

        if (remoteSource instanceof URL) {
            remoteSource = ConnectionFactories.create(remoteSource, remoteSource)
        }

        this.externalMessenger = remoteSource
        this.parsingMessenger = new ParsingMessenger(remoteSource, this.MESSAGE_TYPE)

        this.peer = object.peerID
        this.objectStoreMessenger = internalMessenger

    }

    sync(): Promise<boolean> {

        return new Promise((resolve, reject) => {
            var started = false

            /*if (DEBUG) {
                console.log(`Started syncing with messengers:`)
                console.log(this.externalMessenger)
                console.log(this.objectStoreMessenger)
            }*/

            if (!this.syncing) {

                this.resource.setOnStateChange(() => {
                    this.emit("update")
                })

                this.objectStoreMessenger.on("message", (message, ...args) => this.parsingMessenger.send(message, ...args))

                this.parsingMessenger.on("message", (message: LegionMessage, ...args: any[]) => { // handles operations

                    if (DEBUG)
                        console.log("Synchronizer:", message)

                    if (message instanceof LegionSync || message instanceof LegionOP)
                        this.resource.gotContentFromNetwork(message, message.from)

                })

                let vv = this.resource.versionVector.toJSONString()
                let m = this.resource.getMeta()

                this.parsingMessenger.send(new LegionSync(this.peer, vv, undefined, m))

                started = true
            }

            resolve(started)
        })
    }

}

export abstract class LegionMessage extends Message {

    TYPE = LegionMessage

    from: string
    version: any

    constructor(from: string, version: any) {
        super()
        this.from = from
        this.version = version
    }
}

export type opID = { rID: string, oC: number }

export class LegionOP extends LegionMessage {

    opID: opID
    arg: object
    key: string

    constructor(from: string, vv: object, opID: { rID: string, oC: number }, args: object, key: string,) {
        super(from, vv)
        this.opID = opID
        this.arg = args
        this.key = key
    }

}

export class LegionSync extends LegionMessage {

    delta: any
    meta: any

    constructor(from: string, version: any, delta: any, m: any) {
        super(from, version)
        this.delta = delta
        this.meta = m
    }
}

export class LegionTypeDefs {

    static instance: LegionTypeDefs

    static getInstance() {
        if (!this.instance)
            this.instance = new LegionTypeDefs()

        return this.instance
    }

    private defs: Map<string, any> = new Map()

    static get(type: string) {
        return LegionTypeDefs.getInstance().defs.get(type)
    }

    static define(typeDef: any) {
        LegionTypeDefs.getInstance().defs.set(typeDef.type, typeDef)
    }

}

export function legionSynchronizerFactory(objectType: string, objectID: string, remotes: URL) {
    var messenger = new SimpleMessenger(LegionMessage)
    var object = new CRDT(objectType, messenger, "peer" + Math.random() * 1000)
    return new LegionResourceSynchronizer(object, messenger, remotes)
}

