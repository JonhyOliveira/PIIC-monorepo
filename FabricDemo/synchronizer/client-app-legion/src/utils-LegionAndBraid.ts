import { Class, Message } from "tejosynchronizer/lib/types"
import { BraidMessage } from "./braid_lib/BraidMessenger"
import { LegionMessage, LegionOP, LegionSync } from "./legionlib/LegionSynchronizer"

type version = {
    version: any,
    meta: any
}

export const legionBraidMessageParsers: [Class<Message>, Class<Message>, (message: any) => Message | undefined][] = [
    [LegionMessage, BraidMessage, (message: LegionMessage) => {
        var merge_type = `legion:`

        var version: version = {
            version: message.version,
            meta: undefined
        }

        if (message instanceof LegionOP) {

            let body = {
                opID: message.opID,
                key: message.key,
                arg: message.arg
            }
            return new BraidMessage(merge_type, message.from, undefined, [JSON.stringify(version)], body, undefined)
        }
        else if (message instanceof LegionSync) {

            version.meta = message.meta

            let body = message.delta

            return new BraidMessage(merge_type, message.from, undefined, [JSON.stringify(version)], body, undefined)
        }
        return undefined
    }],
    [BraidMessage, LegionMessage, (message: BraidMessage) => {
        if (message.mergeType != "legion:")
            return undefined

        let content = message.body
        let version: version = message.parents && JSON.parse(message.parents[0])

        if (version) {
            if (version.meta !== undefined) {
                return new LegionSync(message.peer, version.version, content, version.meta)
            }
            else {
                return content && new LegionOP(message.peer, version.version, content.opID, content.arg, content.key)
            }
        }

        return undefined

    }]
]