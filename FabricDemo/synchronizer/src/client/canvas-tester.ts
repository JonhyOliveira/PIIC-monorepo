import { fabric } from 'fabric';
import { v1 as uuid } from "uuid"

import AutoMerge from "automerge"
import * as TejoSynchronizer from "tejosynchronizer"
import { AutoMergeSynchronizer, automergeSynchronizerFactory } from "../automerge_lib/AutoMergeSynchronizer"
import { BraidClientMessenger } from "../braid_lib/BraidMessenger"
import { parsers } from "../automerge_braid_utils";
import logger from '../logging';

type MyObj = fabric.Object & { id: string }
type DocType = {
    [objectID: string]: any
}

TejoSynchronizer.registerMessengerFactory(new URL("braid:"), (...args: any[]) => new BraidClientMessenger(args[0]))
TejoSynchronizer.registerSynchronizerFactory(new URL("automerge:"), automergeSynchronizerFactory)
// @ts-ignore
parsers("automerge").forEach((parser) => TejoSynchronizer.registerMessageParser(...parser))

function objectChanged(object: MyObj, synchronizer: AutoMergeSynchronizer<DocType>) {

    let obj = object.toObject();
    let create = false;
    let diffProps = Object.keys(obj).map((k) => k)


    if (synchronizer.resource[object.id])
        diffProps = diffProps.filter((k) => obj[k] != synchronizer.resource[object.id][k])
    else
        create = true

    synchronizer.resource = AutoMerge.change(synchronizer.resource, (doc) => {
        if (create)
            doc[object.id] = {}

        diffProps.forEach((k) => {
            doc[object.id][k] = obj[k]
        })
    })

    logger.info("changing object", object.id)
}

function objectRemoved(obj: MyObj, synchronizer: AutoMergeSynchronizer<DocType>) {
    synchronizer.resource = AutoMerge.change(synchronizer.resource, (doc) => {
        delete doc[obj.id]
    })

}

function updateCanvas(canvas: fabric.Canvas, synchronizer: AutoMergeSynchronizer<DocType>, patch: AutoMerge.Patch) {

    Object.entries(patch.diffs.props).forEach((propEntry) => { // iterate through changed objects
        const objID = propEntry[0]
        const obj = synchronizer.resource[objID]

        // update canvas
        if (obj) {
            logger.info("object updated:", obj.type, objID)

            // find object to update
            let canvasObj = canvas.getObjects().find(cObj => {
                if ((cObj as MyObj).id == objID) {
                    return cObj
                }
            })

            if (!canvasObj) { // object was not found, create barebones

                if (obj.type === 'rect') {
                    canvasObj = new fabric.Rect()
                } else if (obj.type === 'circle') {
                    canvasObj = new fabric.Circle()
                } else if (obj.type === 'triangle') {
                    canvasObj = new fabric.Triangle()
                } else if (obj.type === "path") {
                    canvasObj = new fabric.Path(obj.path)
                }

                if (canvasObj) {
                    (canvasObj as MyObj).id = objID
                    canvas.add(canvasObj);
                }
            }
            /*else
                console.log("object updated")*/

            if (canvasObj) {
                // update it
                canvasObj.set(obj)
                canvasObj.setCoords()

                // render it
                canvas.renderAll()


            }
        }
        else {
            logger.info("object removed:", objID)

            // find object to remove
            let canvasObj = canvas.getObjects().find(cObj => {
                if ((cObj as MyObj).id == objID) {
                    return cObj
                }
            })

            canvasObj && canvas.remove(canvasObj)

            canvas.renderAll()
        }
    })
}

function synchronizeCanvas(canvas: fabric.Canvas, synchronizer: AutoMergeSynchronizer<DocType>) {

    canvas.on("object:modified", (e) => { // notify peers
        objectChanged(e.target as MyObj, synchronizer)
    })

    canvas.on("before:path:created", (e) => {
        // @ts-ignore
        let o: fabric.Object = e.path;
        (o as MyObj).id = uuid()
        objectChanged(o as MyObj, synchronizer)
    })

    synchronizer.on("update", (patch: AutoMerge.Patch) => { // update canvas accordingly
        if (patch)
            updateCanvas(canvas, synchronizer, patch)
    })
}

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
    private canvasSynchronizer: AutoMergeSynchronizer<DocType>

    readonly clientID: string

    private maxObjects: number

    constructor(maxObjects: number, canvasURL: URL) {

        this.maxObjects = maxObjects

        this.canvasObject = new fabric.Canvas(null)

        this.canvasSynchronizer = (TejoSynchronizer.default.getSynchronizer(new URL("automerge:"), canvasURL, AutoMerge.init()) as AutoMergeSynchronizer<DocType>)

        this.clientID = AutoMerge.getActorId(this.canvasSynchronizer.resource)

        synchronizeCanvas(this.canvasObject, this.canvasSynchronizer)

        this.canvasSynchronizer.sync()
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
            objectChanged(object as MyObj, this.canvasSynchronizer)

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
        objectChanged(object as MyObj, this.canvasSynchronizer)
    }

    removeRandomShape() {
        let objects = this.canvasObject.getObjects()
        let object = objects[Math.floor(Math.random() * objects.length)]
        this.canvasObject.remove(object)

        objectRemoved(object as MyObj, this.canvasSynchronizer)
    }

}
