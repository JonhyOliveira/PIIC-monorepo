"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeObj = exports.modifyObj = exports.addObj = exports.emitRemove = exports.emitModify = exports.emitAdd = void 0;
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const fabric_1 = require("fabric");
const logging_1 = __importDefault(require("../logging"));
const socket = (0, socket_io_client_1.default)("http://localhost:8080");
// emitters
const emitAdd = (obj) => {
    socket.emit('object-added', obj);
    logging_1.default.alert(socket.connected);
};
exports.emitAdd = emitAdd;
const emitModify = (obj) => {
    socket.emit('object-modified', obj);
};
exports.emitModify = emitModify;
const emitRemove = (obj) => {
    socket.emit('object-removed', obj);
};
exports.emitRemove = emitRemove;
// listeners
const addObj = (canvas) => {
    socket.off('new-add');
    socket.on('new-add', (data) => {
        const { obj, id } = data;
        console.log(obj);
        let object;
        if (obj.type === 'rect') {
            object = new fabric_1.fabric.Rect({
                height: obj.height,
                width: obj.width,
            });
        }
        else if (obj.type === 'circle') {
            object = new fabric_1.fabric.Circle({
                radius: obj.radius,
            });
        }
        else if (obj.type === 'triangle') {
            object = new fabric_1.fabric.Triangle({
                width: obj.width,
                height: obj.height,
            });
        }
        else if (obj.type === "path") {
            object = new fabric_1.fabric.Path();
        }
        if (object) {
            object.id = id;
            object && canvas.add(object);
            canvas.renderAll();
        }
    });
};
exports.addObj = addObj;
const modifyObj = (canvas) => {
    socket.on('new-modification', (data) => {
        const { obj, id } = data;
        console.log(obj);
        let object = canvas.getObjects().find(object => object.id === id);
        if (object) {
            object.set(obj);
            object.setCoords();
            canvas.renderAll();
        }
    });
};
exports.modifyObj = modifyObj;
const removeObj = (canvas) => {
    socket.on('new-remove', (data) => {
        const { obj, id } = data;
        let object = canvas.getObjects().find(object => object.id === id);
        if (object) {
            canvas.remove(object);
            canvas.renderAll();
        }
    });
};
exports.removeObj = removeObj;
exports.default = socket;
