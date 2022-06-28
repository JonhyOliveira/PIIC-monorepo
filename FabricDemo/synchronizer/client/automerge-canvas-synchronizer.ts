import { fabric } from 'fabric';
import { v1 as uuid } from "uuid"

import AutoMerge, { Doc } from "automerge"
import * as TejoSynchronizer from "tejosynchronizer"
import { AutoMergeSynchronizer, automergeSynchronizerFactory } from "../automerge_lib/AutoMergeSynchronizer"
import { BraidClientMessenger } from "../braid_lib/BraidMessenger"
import { parsers } from "../automerge_braid_utils";

type MyObj = fabric.Object & { id: string }
type DocType = {
    [objectID: string]: any
}

TejoSynchronizer.registerMessengerFactory(new URL("braid:"), (...args: any[]) => new BraidClientMessenger(args[0]))
TejoSynchronizer.registerSynchronizerFactory(new URL("automerge:"), automergeSynchronizerFactory)
// @ts-ignore
parsers("automerge").forEach((parser) => TejoSynchronizer.registerMessageParser(...parser))

function objectChanged(obj: MyObj, synchronizer: AutoMergeSynchronizer<DocType>) {
    synchronizer.resource = AutoMerge.change(synchronizer.resource, (doc) => {
        doc[obj.id] = obj.toObject()
    })

    console.log("changed object", synchronizer.resource)
}

function updateCanvas(canvas: fabric.Canvas, synchronizer: AutoMergeSynchronizer<DocType>, patch: AutoMerge.Patch) {
    // console.log("updating canvas with patch:", patch)

    Object.entries(patch.diffs.props).forEach((propEntry) => { // iterate through changed objects
        const objID = propEntry[0]
        const obj = synchronizer.resource[objID]

        // update canvas
        if (obj) {
            console.log("object updated:", objID, obj.type, obj)

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
                    console.log("object created");
                    (canvasObj as MyObj).id = objID
                    canvas.add(canvasObj);
                }
            }
            else
                console.log("object updated")

            if (canvasObj) {
                // update it
                canvasObj.set(obj)
                canvasObj.setCoords()

                // render it
                canvas.renderAll()


            }
        }
    })
}

function synchronizeCanvas(canvas: fabric.Canvas, synchronizer: AutoMergeSynchronizer<DocType>) {

    console.log(canvas.toJSON())

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
        console.log("synchornizer patch", patch)
        if (patch)
            updateCanvas(canvas, synchronizer, patch)
    })
}

export default class Canvas {

    private canvasObject: fabric.Canvas
    private canvasSynchronizer: AutoMergeSynchronizer<DocType>

    constructor() {
        this.canvasObject = new fabric.Canvas(null, {
            centeredRotation: true,
            centeredScaling: true,
            fill: "blue",
            backgroundColor: 'white',
            isDrawingMode: false,
            width: window.screen.width * 3 / 4,
            height: window.screen.height * 3 / 4,
        })

        this.canvasSynchronizer = (TejoSynchronizer.default.getSynchronizer(new URL("automerge:"), new URL("braid://localhost:8080/api/doc1"), AutoMerge.init()) as AutoMergeSynchronizer<DocType>)

        synchronizeCanvas(this.canvasObject, this.canvasSynchronizer)
    }

    /**
     * Adds a shape to the synchronized canvas
     * @param type object type
     * @returns the objet if added, undefined otherwise
     */
    addShape(type: string): fabric.Object | undefined {
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
        }

        return object
    }

}
