"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(io) {
    io.on("connection", socket => {
        socket.on('object-added', data => {
            socket.broadcast.emit('new-add', data);
        });
        socket.on('object-modified', data => {
            socket.broadcast.emit('new-modification', data);
        });
    });
}
exports.default = default_1;
