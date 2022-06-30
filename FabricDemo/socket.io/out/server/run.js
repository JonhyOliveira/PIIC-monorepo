"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.use(express_1.default.static("../../client-app/build"));
const server = app.listen(8080, () => {
    logging_1.default.notice("Server listening @ " + JSON.stringify(server.address()));
});
const socket_io_1 = require("socket.io");
const logging_1 = __importDefault(require("../logging"));
const io = new socket_io_1.Server(server);
const socket_1 = __importDefault(require("./socket"));
(0, socket_1.default)(io);
