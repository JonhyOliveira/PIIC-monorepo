import * as AutoMerge from "automerge"
import { randomUUID } from "crypto";
import { ConnectionFactories } from "tejosynchronizer/lib/ConnectionFactoriesStore";
import { ParsingMessenger } from "tejosynchronizer/lib/MessageParser";
import { Class, Message, Messenger, ResourceSynchronizer } from "tejosynchronizer/lib/types";

const DEBUG = false

/**
 * Update event has related patch
 */
export class AutoMergeSynchronizer<T> extends ResourceSynchronizer<AutoMerge.Doc<T>, AutoMergeMessage> {

    TIMER: number = 150

    MESSAGE_TYPE: Class<AutoMergeMessage> = AutoMergeMessage;

    readonly externalMessenger: Messenger<any>

    private parsingMessenger: ParsingMessenger<any, AutoMergeMessage>
    private syncStates: { [peer: string]: AutoMerge.SyncState }

    constructor(resource: AutoMerge.Doc<T>, remoteSource: URL | Messenger<any>) {
        super(resource)

        if (remoteSource instanceof URL) {
            remoteSource = ConnectionFactories.create(remoteSource, remoteSource)
        }

        this.externalMessenger = remoteSource
        this.parsingMessenger = new ParsingMessenger(remoteSource, this.MESSAGE_TYPE)
        this.syncStates = {}
    }

    sync(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!this.syncing) {
                // this.parsingMessenger.send(new AutoMergeMessage(this.actorID))

                this.parsingMessenger.on("message", (message: AutoMergeMessage, fromActorID: string, ...args: any[]) => {

                    if (message instanceof AutoMergeSyncMessage && message.message) {
                        const [nextDoc, nextSyncState, patch] =
                            AutoMerge.receiveSyncMessage(this.resource, this.syncStates[fromActorID] || AutoMerge.initSyncState(), message.message)

                        if (DEBUG) {
                            console.log("New patch: ", patch)
                            if (message.message.length > 0)
                                console.log("message from", fromActorID, message)
                        }

                        this.resource = nextDoc
                        this.syncStates[fromActorID] = nextSyncState

                        resolve(true)
                        this.emit("update", patch)

                        if (patch) {// SOMETHING CHANGED
                            this.updatePeers(...args)
                        }
                    } else { // message is unusable treat as hello
                        if (!this.syncStates[fromActorID]) {
                            console.log("New peer:", fromActorID)
                            this.syncStates[fromActorID] = AutoMerge.initSyncState()
                            this.parsingMessenger.send(new AutoMergeHello(AutoMerge.getActorId(this.resource), []))
                        }
                    }
                })

                setInterval(() => {
                    this.updatePeers()
                }, this.TIMER)

                this.parsingMessenger.send(new AutoMergeHello(AutoMerge.getActorId(this.resource), this.docParents))

                this.syncing = true
            }

            resolve(false)
        })
    }

    private updatePeers(...aditionalArgs: any[]) {

        // entries to be updated
        let newPeerStates: [string, AutoMerge.SyncState][] = []

        // iterate through the actors sync states
        Object.entries(this.syncStates).forEach((entry) => {
            let syncState = entry[1] || AutoMerge.initSyncState()
            let actorID = entry[0]

            // calculate appropriate message to send to a actor (peer)
            const [nextSyncState, syncMessage] = AutoMerge.generateSyncMessage(this.resource, syncState)

            newPeerStates.push([actorID, nextSyncState])

            if (syncMessage && syncMessage.length > 0)
                this.parsingMessenger.send(new AutoMergeSyncMessage(AutoMerge.getActorId(this.resource), syncMessage,
                    this.docParents), actorID, ...aditionalArgs)
        })

        if (DEBUG && newPeerStates.length > 0)
            console.log("updated", newPeerStates.map(pss => pss[0]))

        // update peers sync state
        newPeerStates.forEach(newPeerState => this.syncStates[newPeerState[0]] = newPeerState[1])
    }

    private get docParents() {
        let lastChangeEncoded = AutoMerge.getLastLocalChange(this.resource)

        if (lastChangeEncoded)
            return AutoMerge.decodeChange(lastChangeEncoded).deps
        else
            return []

    }

}

export abstract class AutoMergeMessage extends Message {
    TYPE: Class<AutoMergeMessage> = AutoMergeMessage;

    senderActorID: string
    message?: AutoMerge.BinarySyncMessage
    dependencies: string[]

    constructor(actorID: string, message: AutoMerge.BinarySyncMessage | undefined, dependencies: string[]) {
        super()
        this.senderActorID = actorID
        this.message = message
        this.dependencies = dependencies
    }

}

export class AutoMergeSyncMessage extends AutoMergeMessage {

    constructor(actorID: string, message: AutoMerge.BinarySyncMessage, dependencies: string[]) {
        super(actorID, message, dependencies)
    }
}

export class AutoMergeHello extends AutoMergeMessage {
    static hello = true

    constructor(actorID: string, dependencies: string[]) {
        super(actorID, undefined, dependencies)
    }
}

export function automergeSynchronizerFactory(remote: URL, initialDoc: AutoMerge.Doc<any>) {
    return new AutoMergeSynchronizer(initialDoc, remote)
}