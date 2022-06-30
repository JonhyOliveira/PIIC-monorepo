import * as TejoSynchronizer from "tejosynchronizer"
import { BraidMessage, BraidServerMessenger } from "../braid_lib/BraidMessenger"
import express from "express"
import { SwitchMessenger } from "tejosynchronizer/lib/GeneralMessengers"
import { ConnectionFactories } from "tejosynchronizer/lib/ConnectionFactoriesStore"
import Cors from "cors"
import { AutoMergeSynchronizer, automergeSynchronizerFactory } from "../automerge_lib/AutoMergeSynchronizer"
import AutoMerge from "automerge"
import { parsers } from "../automerge_braid_utils"
import logger, { stream } from "../logging"
import morgan from "morgan"

TejoSynchronizer.registerMessengerFactory(new URL("braid:"), (...args: any[]) => new BraidServerMessenger(args[0], args[1]))
TejoSynchronizer.registerSynchronizerFactory(new URL("automerge:"), automergeSynchronizerFactory)
// @ts-ignore
parsers("automerge").forEach((parser) => TejoSynchronizer.registerMessageParser(...parser))

const braidify = require("braidify-alt").http_server

const cors = Cors({
    methods: ["GET", "PUT"],
    origin: "*"
})

const jsonParser = express.json({
    verify: (req, res, buf, encoding) => {
        if (buf && buf.length) {
            // @ts-ignore
            req.size = buf.byteLength
        }
    },
    limit: "25MB"
})

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
                logger.debug("new", req.peer, subscribersMessenger.messengers)
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

import path from "path"
console.log(__dirname, path.join(__dirname, "../../client-app-automerge/build"))

{

    // @ts-ignore
    app.use(express.static(path.join(__dirname, "../client-app-automerge/build")), morgan('combined', { stream: stream }))
    app.use("/api/doc1", cors, braidify, jsonParser, resourceMounter(new URL("automerge:")))
    app.use("/api/doc2", cors, braidify, jsonParser, resourceMounter(new URL("automerge:")))
}

app.listen(8080, () => logger.info(`Listening @ http://localhost:${8080}/`))