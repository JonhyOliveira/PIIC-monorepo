import express from "express"
const app = express()

import path from "path"
app.use(express.static(path.join(__dirname, "../client-app/build")))

const server = app.listen(8080, () => {
    logger.notice("Server listening @ " + JSON.stringify(server.address()))
})

import { Server } from "socket.io";
import logger from "../logging"
const io = new Server(server);

import fabricPlugin from "./socket"

fabricPlugin(io)
