"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = __importDefault(require("../logging"));
function default_1(io) {
    io.on("connection", socket => {
        socket.use((event, next) => {
            logging_1.default.notice(`event by ${socket.id}`, event);
            next();
        });
        logging_1.default.info(`socket ${socket.id} conneced`);
        socket.on('object-added', data => {
            socket.broadcast.emit('new-add', data);
        });
        socket.on('object-modified', data => {
            socket.broadcast.emit('new-modification', data);
        });
        socket.on('object-removed', data => {
            socket.broadcast.emit('new-remove', data);
        });
        socket.on("disconnect", (reason) => {
            logging_1.default.info(`socket ${socket.id} disconnected`, reason);
        });
    });
}
exports.default = default_1;
