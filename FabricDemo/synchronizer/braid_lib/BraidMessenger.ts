import EventEmitter from "events"
// @ts-ignore
import { fetch as braid_fetch } from "braidify-alt"
import { Message, Messenger } from "tejosynchronizer/lib/types"
import { SwitchMessenger } from "tejosynchronizer/lib/GeneralMessengers"

const DEBUG = false

/**
 * Events from this class are as follows:
 * message[message, peer, (connection)]
 */
export abstract class BraidMessenger extends EventEmitter implements Messenger<BraidMessage> {

    readonly MESSAGE_TYPE = BraidMessage

    protected readonly peer: string

    connected: boolean
    reconnect: boolean

    constructor(peer: string, reconnect: boolean) {
        super()
        this.peer = peer
        this.reconnect = reconnect
        this.connected = false
    }

    abstract send(message: any, ...args: any[]): void
    abstract disconnect(): void
    abstract connect(reInit: any): void

}

export class BraidClientMessenger extends BraidMessenger {

    private resourceURL: URL
    private abortController: AbortController

    constructor(resourceURL: URL) {
        super("non used", false)
        this.resourceURL = resourceURL
        this.resourceURL.protocol = "http:"
        this.abortController = new AbortController()

    }

    send(message: BraidMessage) {

        if (DEBUG)
            console.log("Braid Messenger:", message)

        if (!this.connected)
            this.connect(message)

        else {
            var params = {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",

                },
                body: JSON.stringify(message.body), version: message.version,
                parents: message.parents, patches: message.patches,
                peer: message.peer || this.peer, signal: this.abortController.signal
            }

            if (message.mergeType)
                // @ts-ignore
                params.headers["Merge-Type"] = message.mergeType

            var url = this.resourceURL.toString()
            url = url.replace(/^braid/, "http")


            braid_fetch(url, params)

        }
    }
    disconnect(initMessage?: BraidMessage) {
        this.abortController.abort()
        this.connected = false
    }

    connect(initMessage: BraidMessage) {

        var params = {
            headers: {},
            subscribe: { keep_alive: true },
            signal: this.abortController.signal,
            peer: initMessage.peer || this.peer, version: initMessage.version,
            parents: initMessage.parents
        }

        if (initMessage.mergeType)
            // @ts-ignore
            params.headers["Merge-Type"] = initMessage.mergeType


        var url = this.resourceURL.toString()
        url = url.replace(/^braid/, "http")

        console.log("Connecting to", url)

        // TODO braid_fetch could be replaced with XMLHttpRequest for more efficient connection detection
        braid_fetch(url, params)
            // @ts-ignore
            .andThen((version) => {
                if (DEBUG)
                    console.log("Got message from remote: ", version)

                this.connected = true
                this.emit("message", new BraidMessage(
                    version["Merge-Type"], version.peer, version.version,
                    version.parents, JSON.parse(version.body), version.patches
                ), version.peer)
            })
            .catch((e: Error) => {
                console.log(this.peer, "disconnected")
                if (this.reconnect) {
                    this.connected = false
                    this.connect(initMessage) // try to reconnect
                }
                else
                    this.disconnect()
            })

        this.connected = true
    }

}

export class BraidServerMessenger extends BraidMessenger {

    private activeReq: any
    private resourceMessenger: SwitchMessenger<BraidMessage>

    public constructor(req: any, resourceMessenger: SwitchMessenger<BraidMessage>) {
        super("server", false);
        this.activeReq = req;
        this.resourceMessenger = resourceMessenger

    }

    put(req: any): void {
        var message = new BraidMessage(req.mergeType, req.peer,
            req.version, req.parents, req.body, req.patches)

        // console.log("put")

        this.emit("message", message)
        req.res.sendStatus(200)

    }

    send(message: BraidMessage, peer: any, req: any): void {

        // console.log([peer, req && req.method], "messenger")

        // use provided connection or default one
        var endpoint = req

        if (!endpoint) {
            if (!this.activeReq)
                return

            if (!this.connected)
                this.connect(this.activeReq)

            endpoint = this.activeReq

        }

        if (DEBUG)
            console.info("Sending message:", message, `to ${this.peer}`);

        endpoint.res.sendVersion({
            version: message.version,
            "Merge-Type": message.mergeType,
            parents: message.parents,
            patches: message.patches,
            body: JSON.stringify(message.body),
            peer: message.peer
        })

        // console.log(endpoint.method, endpoint.res.isSubscription)

    }

    disconnect() {
        if (DEBUG)
            console.log("Disconnected from peer", this.peer)
        this.resourceMessenger.removeMessenger(this.activeReq.peer)
        this.activeReq.res.end()
        this.activeReq = undefined
    }

    connect(req: any) {

        if (DEBUG) {
            console.log(`Connecting to peer ${req.peer}...`)
            console.time(`Connection to peer ${req.peer} established`)
        }

        if (!req || (this.activeReq && this.activeReq.res.isSubscription))
            return // already connected or cant connect with given request

        this.activeReq = req

        this.resourceMessenger.setMessenger(this.activeReq.peer, this)
        this.activeReq.startSubscription({
            onClose: () => {
                console.log(this.activeReq.peer, "disconnected")
            }
        })

        this.connected = true
        if (DEBUG)
            console.timeEnd(`Connection to peer ${req.peer} established`)

        // extract message from headers (this should be a GET request, so no body)
        var message = new BraidMessage(this.activeReq.mergeType, this.activeReq.peer,
            this.activeReq.version, this.activeReq.parents, undefined, undefined)

        this.emit("message", message, this.peer, this.activeReq)
    }

}

export class BraidMessage extends Message {

    TYPE: abstract new (...args: any[]) => any = BraidMessage


    mergeType: string
    peer: string
    version: string | undefined
    parents: string[] | undefined
    body: any | undefined
    patches: Patch[] | undefined

    constructor(mergeType: string, peer: string, version: string | undefined, parents: string[] | undefined, body: any | undefined, patches: Patch[] | undefined) {
        super()
        this.mergeType = mergeType
        this.peer = peer
        this.version = version
        this.parents = parents
        this.body = body
        this.patches = patches
    }
}

export type Patch = {

}