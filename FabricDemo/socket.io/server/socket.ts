import { Server } from "socket.io"

export default function (io: Server) {

    io.on("connection", socket => {

        socket.on('object-added', data => {
            socket.broadcast.emit('new-add', data);
        })

        socket.on('object-modified', data => {
            socket.broadcast.emit('new-modification', data);
        })

    })

}