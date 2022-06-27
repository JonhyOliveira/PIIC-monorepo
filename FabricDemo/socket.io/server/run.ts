import express from "express"
const app = express()

import path from "path"
app.use(express.static("../client-app/build"))

const server = app.listen(8080, () => {
    console.log("Server listening @", server.address())
})

import { Server } from "socket.io";
const io = new Server(server);

import fabricPlugin from "./socket"

fabricPlugin(io)
