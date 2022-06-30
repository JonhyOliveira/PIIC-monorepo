import { Server } from "socket.io"
import logger, { metricsLogger } from "../logging";

export default function (io: Server) {

    io.on("connection", socket => {

        socket.use((event, next) => {
            logger.notice(`event by ${socket.id}`, event)

            next()
        })

        logger.info(`socket ${socket.id} conneced`)

        socket.on('object-added', data => {
            socket.broadcast.emit('new-add', data);
        })

        socket.on('object-modified', data => {
            socket.broadcast.emit('new-modification', data);
        })

        socket.on('object-removed', data => {
            socket.broadcast.emit('new-remove', data);
        })

        socket.on("disconnect", (reason) => {
            logger.info(`socket ${socket.id} disconnected`, reason)
        })

    })

}

