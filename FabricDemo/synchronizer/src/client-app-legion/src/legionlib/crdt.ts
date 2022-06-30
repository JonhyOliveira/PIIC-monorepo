import { Messenger } from "tejosynchronizer/lib/types";
import { LegionMessage, LegionOP, LegionSync, LegionTypeDefs, opID } from "./LegionSynchronizer";
import { VersionVector } from "./VersionVector";

const DEBUG = false

export class CRDT {

    readonly peerID: string
    private messenger: Messenger<LegionMessage>
    private crdt: any
    private state: any
    readonly versionVector: VersionVector

    private localOPCounter: number
    private locals: { [operation: string]: ((...args: any[]) => any) }
    private remotes: { [operation: string]: ((...args: any[]) => any) }

    constructor(type: string, messenger: Messenger<LegionMessage>, peerID: string) {
        this.peerID = peerID
        this.messenger = messenger
        this.crdt = LegionTypeDefs.get(type)

        /**
         * Initialize state
         */
        this.state = {}
        var stateKey = Object.keys(this.crdt.crdt.base_value)
        stateKey.forEach((key) => {
            if (typeof this.crdt.crdt.base_value[key] == "function")
                this.state[key] = new this.crdt.crdt.base_value[key]
            else // convert to object
                this.state[key] = JSON.parse(JSON.stringify(this.crdt.crdt.base_value[key]))
        })

        this.getValue = this.crdt.crdt.getValue
        this.garbageCollect = this.crdt.crdt.garbageCollect;
        this.getDelta = this.crdt.crdt.getDelta;
        this.applyDelta = this.crdt.crdt.applyDelta;
        this.getMeta = this.crdt.crdt.getMeta;

        this.versionVector = new VersionVector()

        /**
         * Setup operations
         */
        this.locals = {}
        this.remotes = {}

        var opKeys = Object.keys(this.crdt.crdt.operations)
        var c = this
        this.localOPCounter = 0

        opKeys.forEach((key) => (function (key) {
            c.locals[key] = c.crdt.crdt.operations[key].local;
            c.remotes[key] = c.crdt.crdt.operations[key].remote;

            // @ts-ignore
            c[key] = function () {
                var opID: opID = { rID: c.peerID, oC: ++c.localOPCounter };
                var args = [];
                for (var arg_i = 0; arg_i < arguments.length; arg_i++) {
                    args.push(arguments[arg_i]);
                }
                args.push(opID);

                var ret = c.locals[key].apply(c, args);

                if (ret.toNetwork) {

                    var remote_ret = c.remotes[key].apply(c, [ret.toNetwork]);
                    c.propagate(opID, ret.toNetwork, c.versionVector.toJSONString(), key, c.peerID);

                    //console.info(c.versionVector.toJSONString());

                    c.addOpToCurrentVersionVector(opID);

                    //console.info(c.versionVector.toJSONString());

                    (function () {
                        if (c.callback)
                            c.callback(remote_ret, { local: true });
                    })();

                } else {
                    //No version change.
                    --c.localOPCounter;
                }
                if (ret.toInterface != null) {
                    return ret.toInterface;
                }
            };
        })(key))

        this.callback = undefined

    }

    private callback: ((remote_ret: any, x: { local: boolean }) => void) | undefined
    getValue: () => any
    garbageCollect: () => void
    getDelta: (vv: any, m: any) => any
    applyDelta: (delta: any, vv: any, m: any) => any
    getMeta: () => any

    propagate(opID: { rID: string, oC: number }, opArgs: any, opVV: {}, opKey: string, from: any) {
        let m = new LegionOP(from, opVV, opID, opArgs, opKey)

        if (DEBUG)
            console.log("CRDT send:", m)

        this.messenger.send(m)
    }

    private addOpToCurrentVersionVector(opID: opID) {
        this.versionVector.set(opID.rID, opID.oC)
    }

    setOnStateChange(callback: (...any: any[]) => any) {
        this.callback = callback
    }

    deltaOperationFromNetwork(deltaOperation: LegionOP, fromPeer: any) {
        var remote_ret = this.remotes[deltaOperation.key].apply(this, [deltaOperation.arg])
        this.addOpToCurrentVersionVector(deltaOperation.opID)
        this.propagate(deltaOperation.opID, deltaOperation.arg, deltaOperation.version, deltaOperation.key, fromPeer)

        if (this.callback && remote_ret)
            this.callback(remote_ret, { local: false })

    }

    deltaFromNetwork(delta: LegionSync, fromPeer: any) {
        var ret = {
            hadNew: false
        }

        if (delta.delta) {
            var applied = this.applyDelta(delta.delta, delta.version, delta.meta)
            if (applied.flattened) {
                ret.hadNew = true
                Object.keys(delta.version).forEach((key) => {
                    if (this.versionVector.contains(key))
                        this.versionVector.set(key, Math.max(delta.version[key], this.versionVector.get(key)))
                    else
                        this.versionVector.set(key, delta.version[key])
                })

                let m = new LegionSync(this.peerID, applied.flattened.vv, applied.flattened.d, applied.flattened.m)

                if (DEBUG)
                    console.log("CRDT send: ", m)

                this.messenger.send(m)
            }


            if (this.callback && applied.change)
                this.callback(applied.change, { local: false });
        }
        else { // if no delta provided compute delta and send
            let m = new LegionSync(this.peerID, this.versionVector.toJSONString(), this.getDelta(delta.version, delta.meta), this.getMeta())

            this.messenger.send(m)
        }

        return ret
    }

    gotContentFromNetwork(message: LegionMessage, fromPeer: string) {

        if (DEBUG)
            console.log("GCFN:", message)

        if (message instanceof LegionOP) {

            if (this.versionVector.contains(message.opID.rID) && this.versionVector.get(message.opID.rID) >= message.opID.oC)
                return // outdated OP

            if (DEBUG)
                console.log("NEW OP")
            this.deltaOperationFromNetwork(message, fromPeer)
        }
        else if (message instanceof LegionSync)
            this.deltaFromNetwork(message, fromPeer)
        else {
            // TODO what to do here?
        }
    }

}
