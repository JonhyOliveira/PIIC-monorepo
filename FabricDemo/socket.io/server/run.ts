import express from "express"
const app = express()

app.use(express.static("../../client-app/build"))

const server = app.listen(8080, () => {
    logger.notice("Server listening @ " + JSON.stringify(server.address()))
})

import { Server } from "socket.io";
import logger from "../logging"
const io = new Server(server);

import fabricPlugin from "./socket"

fabricPlugin(io)
