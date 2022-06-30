"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestingCanvas = exports.CanvasObjectTests = void 0;
const fabric_1 = require("fabric");
const uuid_1 = require("uuid");
const socket_client_1 = require("./socket-client");
class CanvasObjectTests {
    static randomChange(object) {
        // select random property
        let obj = object.toObject();
        let r = Math.random();
        let property;
        let value;
        if (r > .5) {
            let scalableProperties = ["scaleX", "scaleY"];
            value = Math.max((Math.random() * 3), .2);
            // scale random property
            property = scalableProperties[Math.floor(Math.random() * scalableProperties.length)];
        }
        else {
            let scalarProperties = ["top", "left", "angle", "skewX", "skewY"];
            value = Math.random() * 9 + 1;
            property = scalarProperties[Math.floor(Math.random() * scalarProperties.length)];
        }
        // logger.info("randomly changing", property)
        object.set(property, value);
        object.set("fill", `rgb(${Math.random() * 100 + 100},${Math.random() * 100 + 100},${Math.random() * 100 + 100})`);
    }
}
exports.CanvasObjectTests = CanvasObjectTests;
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]
        ];
    }
    return array;
}
class TestingCanvas {
    constructor(maxObjects, canvasURL) {
        this.actions = [
            () => {
                if (this.numCanvasObjects >= this.maxObjects && this.maxObjects >= 0)
                    return null;
                // random shape
                return {
                    label: "create random",
                    nextPace: .9,
                    actionTime: 600,
                    execute: () => {
                        let shapes = ["circle", "rectangle", "triangle"];
                        this.addShape(shapes[Math.floor(Math.random() * shapes.length)]);
                    }
                };
            },
            () => {
                if (this.numCanvasObjects <= 0)
                    return null;
                else
                    return { label: "modify random", nextPace: 1.8, actionTime: "MIN", execute: () => this.modifyRandomShape() };
            },
            () => {
                if (this.numCanvasObjects <= 0)
                    return null;
                else
                    return { label: "modify random", nextPace: 1.1, actionTime: "MIN", execute: () => this.modifyRandomShape() };
            },
            () => {
                if (this.numCanvasObjects <= 0)
                    return null;
                else
                    return { label: "remove random", nextPace: .7, actionTime: 850, execute: () => this.removeRandomShape() };
            }
        ];
        this.maxObjects = maxObjects;
        this.canvasObject = new fabric_1.fabric.Canvas(null);
        (0, socket_client_1.addObj)(this.canvasObject);
        (0, socket_client_1.modifyObj)(this.canvasObject);
        (0, socket_client_1.removeObj)(this.canvasObject);
    }
    get numCanvasObjects() {
        return this.canvasObject.getObjects().length;
    }
    nextAction() {
        shuffle(this.actions);
        for (let i = 0; i < this.actions.length; i++) {
            let res = this.actions[i]();
            if (res != null)
                return res;
        }
        return null;
    }
    /**
     * Adds a shape to the synchronized canvas
     * @param type object type
     * @returns the objet if added, undefined otherwise
     */
    addShape(type) {
        let object;
        if (type === "rectangle") {
            object = new fabric_1.fabric.Rect({
                height: 75,
                width: 150
            });
        }
        else if (type === "triangle") {
            object = new fabric_1.fabric.Triangle({
                width: 100,
                height: 100
            });
        }
        else if (type === "circle") {
            object = new fabric_1.fabric.Circle({
                radius: 50
            });
        }
        if (object) {
            object.id = (0, uuid_1.v1)();
            object && this.canvasObject.add(object);
            this.canvasObject.renderAll();
            (0, socket_client_1.emitAdd)({ obj: object, id: object.id });
            // logger.info("add")
        }
        return object;
    }
    /**
     * Modifies a random shape in the canvas
     */
    modifyRandomShape() {
        let objects = this.canvasObject.getObjects();
        let object = objects[Math.floor(Math.random() * objects.length)];
        CanvasObjectTests.randomChange(object);
        // logger.info("modify")
        const modifiedObj = {
            obj: object,
            id: object.id,
        };
        (0, socket_client_1.emitModify)(modifiedObj);
    }
    removeRandomShape() {
        let objects = this.canvasObject.getObjects();
        let object = objects[Math.floor(Math.random() * objects.length)];
        this.canvasObject.remove(object);
        const removedObj = {
            obj: object,
            id: object.id
        };
        (0, socket_client_1.emitRemove)(removedObj);
    }
}
exports.TestingCanvas = TestingCanvas;
TestingCanvas.canvasDimension = [200, 200];
