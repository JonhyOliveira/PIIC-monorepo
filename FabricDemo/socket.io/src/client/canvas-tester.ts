import { fabric } from 'fabric';
import { v1 as uuid } from "uuid"

import { addObj, modifyObj, removeObj, emitAdd, emitModify, emitRemove } from "./socket-client"
import logger from '../logging';

export type MyObj = fabric.Object & { id: string }

export class CanvasObjectTests {

    static randomChange(object: fabric.Object) {
        // select random property
        let obj = object.toObject()
        let r = Math.random()

        let property: keyof fabric.Object
        let value: any

        if (r > .5) {
            let scalableProperties: (keyof fabric.Object)[] = ["scaleX", "scaleY"]

            value = Math.max((Math.random() * 3), .2)

            // scale random property
            property = scalableProperties[Math.floor(Math.random() * scalableProperties.length)]

        } else {
            let scalarProperties: (keyof fabric.Object)[] = ["top", "left", "angle", "skewX", "skewY"]

            value = Math.random() * 9 + 1

            property = scalarProperties[Math.floor(Math.random() * scalarProperties.length)]
        }


        // logger.info("randomly changing", property)
        object.set(property, value)
        object.set("fill", `rgb(${Math.random() * 100 + 100},${Math.random() * 100 + 100},${Math.random() * 100 + 100})`)


    }

}

type Shape = "rectangle" | "triangle" | "circle"

type TestAction = {

    /**
     * Name of the action
     */
    label?: string

    /**
     * How this action affects thinking time for next actions
     */
    nextPace: number,
    /**
     * How long it takes to do this action
     */
    actionTime: number | "MAX" | "MIN"

    execute(): void
} | null

interface Testable {
    nextAction(): TestAction
}

function shuffle(array: any[]) {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {

        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}

export class TestingCanvas implements Testable {

    static canvasDimension = [200, 200]

    private canvasObject: fabric.Canvas

    private maxObjects: number;

    constructor(maxObjects: number, canvasURL: URL) {

        this.maxObjects = maxObjects

        this.canvasObject = new fabric.Canvas(null)

        addObj(this.canvasObject)
        modifyObj(this.canvasObject)
        removeObj(this.canvasObject)
    }

    get numCanvasObjects() {
        return this.canvasObject.getObjects().length
    }

    nextAction(): TestAction {

        shuffle(this.actions)
        for (let i = 0; i < this.actions.length; i++) {
            let res = this.actions[i]()
            if (res != null)
                return res
        }

        return null;

    }

    private actions: (() => TestAction)[] = [
        () => { // add shape

            if (this.numCanvasObjects >= this.maxObjects && this.maxObjects >= 0)
                return null

            // random shape
            return {
                label: "create random",
                nextPace: .9,
                actionTime: 600,
                execute: () => {
                    let shapes: Shape[] = ["circle", "rectangle", "triangle"]
                    this.addShape(shapes[Math.floor(Math.random() * shapes.length)])
                }
            }
        },
        () => { // modify random shape 
            if (this.numCanvasObjects <= 0)
                return null
            else
                return { label: "modify random", nextPace: 1.8, actionTime: "MIN", execute: () => this.modifyRandomShape() }
        },
        () => { // modify random shape 
            if (this.numCanvasObjects <= 0)
                return null
            else
                return { label: "modify random", nextPace: 1.1, actionTime: "MIN", execute: () => this.modifyRandomShape() }
        },
        () => { // remove random shape

            if (this.numCanvasObjects <= 0)
                return null
            else
                return { label: "remove random", nextPace: .7, actionTime: 850, execute: () => this.removeRandomShape() }

        }
    ]


    /**
     * Adds a shape to the synchronized canvas
     * @param type object type
     * @returns the objet if added, undefined otherwise
     */
    addShape(type: Shape): fabric.Object | undefined {
        let object

        if (type === "rectangle") {
            object = new fabric.Rect({
                height: 75,
                width: 150
            });

        } else if (type === "triangle") {
            object = new fabric.Triangle({
                width: 100,
                height: 100
            })

        } else if (type === "circle") {
            object = new fabric.Circle({
                radius: 50
            })
        }

        if (object) {
            (object as MyObj).id = uuid()
            object && this.canvasObject.add(object)
            this.canvasObject.renderAll()

            emitAdd({ obj: object, id: (object as MyObj).id })
            // logger.info("add")
        }

        return object
    }

    /**
     * Modifies a random shape in the canvas
     */
    modifyRandomShape() {
        let objects = this.canvasObject.getObjects()
        let object = objects[Math.floor(Math.random() * objects.length)]
        CanvasObjectTests.randomChange(object)
        // logger.info("modify")
        const modifiedObj = {
            obj: object,
            id: (object as MyObj).id,
        }

        emitModify(modifiedObj)
    }

    removeRandomShape() {
        let objects = this.canvasObject.getObjects()
        let object = objects[Math.floor(Math.random() * objects.length)]
        this.canvasObject.remove(object)

        const removedObj = {
            obj: object,
            id: (object as MyObj).id
        }

        emitRemove(removedObj)
    }

}
