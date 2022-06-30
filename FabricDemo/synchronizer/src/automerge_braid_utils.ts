import AutoMerge from "automerge"
import { Class, Message } from "tejosynchronizer/lib/types"
import { AutoMergeHello, AutoMergeMessage, AutoMergeSyncMessage } from "./automerge_lib/AutoMergeSynchronizer"
import { BraidMessage } from "./braid_lib/BraidMessenger"

export const parsers: (mergeType: string) => [Class<Message>, Class<Message>, (message: any) => Message | undefined][] =
    (mergeType: string) =>
        [
            [AutoMergeMessage, BraidMessage, (message: AutoMergeMessage) => {

                if (message instanceof AutoMergeSyncMessage)
                    return new BraidMessage(mergeType, message.senderActorID, message.message && JSON.stringify(AutoMerge.Backend.decodeSyncMessage(message.message).heads), message.dependencies, message.message, undefined)
                else if (message instanceof AutoMergeHello)
                    return new BraidMessage(mergeType, message.senderActorID, undefined, message.dependencies, { hello: true }, undefined)
            }],
            [BraidMessage, AutoMergeMessage, (message: BraidMessage) => {

                if (message.body && !message.body.hello) {
                    // convert from json format to byte array
                    let array = new Uint8Array(Object.values(message.body))

                    // @ts-ignore
                    array.__binarySyncMessage = true

                    // @ts-ignore
                    return new AutoMergeSyncMessage(message.peer, array, message.parents || [])
                }
                else
                    return new AutoMergeHello(message.peer, message.parents || [])
            }]
        ]