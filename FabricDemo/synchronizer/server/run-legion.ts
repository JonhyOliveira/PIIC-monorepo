import * as TejoSynchronizer from "tejosynchronizer"
import { BraidMessage, BraidServerMessenger } from "../braid_lib/BraidMessenger"
import { legionBraidMessageParsers } from "../utils-LegionAndBraid"
import { LegionResourceSynchronizer, legionSynchronizerFactory, LegionTypeDefs } from "../legionlib/LegionSynchronizer"

// @ts-ignore
legionBraidMessageParsers.forEach(value => TejoSynchronizer.registerMessageParser(...value))

TejoSynchronizer.registerMessengerFactory(new URL("braid:"), (...args: any[]) => new BraidServerMessenger(args[0], args[1]))
TejoSynchronizer.registerSynchronizerFactory(new URL("legion:"), legionSynchronizerFactory)

LegionTypeDefs.define(require("../legionlib/crdtLib/deltaList").DELTA_List)
LegionTypeDefs.define(require("../legionlib/crdtLib/deltaCounter").DELTA_Counter)
LegionTypeDefs.define(require("../legionlib/crdtLib/deltaMap").DELTA_Map)

// HTTP server

import express from "express"
import { SwitchMessenger } from "tejosynchronizer/lib/GeneralMessengers"
import { ConnectionFactories } from "tejosynchronizer/lib/ConnectionFactoriesStore"
const braidify = require("braidify-alt").http_server
import Cors from "cors"

const cors = Cors({
    methods: ["GET", "PUT"],
    origin: "*"
})

const jsonParser = express.json({ limit: "1MB" })

const resourceMounter = function (URI: URL) {

    const subscribersMessenger = new SwitchMessenger([], BraidMessage)

    const resourceSynchronizer: LegionResourceSynchronizer =
        (TejoSynchronizer.default.getSynchronizer(URI, ...(URI.pathname.split(":")), subscribersMessenger) as LegionResourceSynchronizer)

    resourceSynchronizer.sync() // will not send init sync message to anyone (no messegener attached to the subscribers messenger)

    return (req: any, res: any, next: any) => {
        const url = new URL(req.url, `braid://${req.headers.host}`)

        if (req.peer) {

            // @ts-ignore
            let con: BraidServerMessenger | undefined = subscribersMessenger.getMessenger(req.peer)
            if (!con) {
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

var app = express()

// resource mounting
{
    app.use(express.static("../../client-app-legion/build"))
    app.use("/api/M", cors, braidify, jsonParser, resourceMounter(new URL("legion:M:x")))
    app.use("/api/C", cors, braidify, jsonParser, resourceMounter(new URL("legion:C:x")))
}

app.listen(8080, () => console.log("braid server listening on http://localhost:8080"))
