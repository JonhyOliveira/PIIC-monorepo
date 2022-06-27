import * as TejoSynchronizer from "tejosynchronizer"
import { AutoMergeSynchronizer, automergeSynchronizerFactory } from "../automerge_lib/AutoMergeSynchronizer"
import { BraidClientMessenger } from "../braid_lib/BraidMessenger"
import { parsers } from "../automerge_braid_utils";
import AutoMerge from "automerge"
import { fabric } from "fabric"

TejoSynchronizer.registerMessengerFactory(new URL("braid:"), (...args: any[]) => new BraidClientMessenger(args[0]))
TejoSynchronizer.registerSynchronizerFactory(new URL("automerge:"), automergeSynchronizerFactory)
parsers("automerge").forEach((parser) => TejoSynchronizer.registerMessageParser(...parser))

const synchronizeCanvas = (canvas: fabric.Canvas, remote: URL) => {

    console.log(canvas.toJSON())

    let canvasSynchronizer = (TejoSynchronizer.default.getSynchronizer(new URL("automerge:"), remote, AutoMerge.init()) as AutoMergeSynchronizer<any>)

    canvasSynchronizer.sync().then(() => {

        canvas.on("object:modified", (e) => {
            console.log(canvas.toJSON())
            console.log(canvas.toJSON())
        })

    })
}


var canvas = new fabric.Canvas(null, {
    centeredRotation: true,
    centeredScaling: true,
    fill: "blue",
    backgroundColor: 'white',
    isDrawingMode: true,
    width: window.screen.width * 3 / 4,
    height: window.screen.height * 3 / 4,
})

var resourceURL = new URL("braid://localhost:8080/api/doc1")

synchronizeCanvas(canvas, resourceURL)