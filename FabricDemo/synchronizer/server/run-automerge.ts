import * as TejoSynchronizer from "tejosynchronizer"
import { BraidMessage, BraidServerMessenger } from "../braid_lib/BraidMessenger"
import express from "express"
import { SwitchMessenger } from "tejosynchronizer/lib/GeneralMessengers"
import { ConnectionFactories } from "tejosynchronizer/lib/ConnectionFactoriesStore"
import Cors from "cors"
import { AutoMergeSynchronizer, automergeSynchronizerFactory } from "../automerge_lib/AutoMergeSynchronizer"
import AutoMerge from "automerge"
import { parsers } from "../automerge_braid_utils"

TejoSynchronizer.registerMessengerFactory(new URL("braid:"), (...args: any[]) => new BraidServerMessenger(args[0], args[1]))
TejoSynchronizer.registerSynchronizerFactory(new URL("automerge:"), automergeSynchronizerFactory)
// @ts-ignore
parsers("automerge").forEach((parser) => TejoSynchronizer.registerMessageParser(...parser))

const braidify = require("braidify-alt").http_server

const cors = Cors({
    methods: ["GET", "PUT"],
    origin: "*"
})

const jsonParser = express.json({ limit: "1MB" })

var app = express()

// resource mounting

function resourceMounter<T>(URI: URL, doc?: AutoMerge.Doc<T>) {

    const subscribersMessenger = new SwitchMessenger([], BraidMessage)

    const resourceSynchronizer: AutoMergeSynchronizer<T> =
        (TejoSynchronizer.default.getSynchronizer(URI, subscribersMessenger, doc || AutoMerge.init()) as AutoMergeSynchronizer<T>)

    resourceSynchronizer.sync() // will not send init sync message to anyone (no messegener attached to the subscribers messenger)

    return (req: any, res: any, next: any) => {
        const url = new URL(req.url, `braid://${req.headers.host}`)

        if (req.peer) {

            // @ts-ignore
            let con: BraidServerMessenger | undefined = subscribersMessenger.getMessenger(req.peer)
            if (!con) {
                // @ts-ignore
                console.log("new", req.peer, subscribersMessenger.messengers)
                con = (ConnectionFactories.create(url, req, subscribersMessenger) as BraidServerMessenger)
                // @ts-ignore
                subscribersMessenger.setMessenger(req.peer, con)
            }

            if (req.method == "GET" && req.subscribe) {
                con.connect(req)
            }
            else if (req.method == "PUT") {
                con.put(req)
            }
        }
    }
}

{
    app.use(express.static("../../client-app-automerge/build"))
    app.use("/api/doc1", cors, braidify, jsonParser, resourceMounter(new URL("automerge:")))
    app.use("/api/doc2", cors, braidify, jsonParser, resourceMounter(new URL("automerge:")))
}

app.listen(8080, () => console.log(`Listening @ http://localhost:${8080}/`))