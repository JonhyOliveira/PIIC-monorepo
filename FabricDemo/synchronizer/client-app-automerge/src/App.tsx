import "./App.css";
import React, { useState, useEffect } from 'react';
import { fabric } from 'fabric';
import { v1 as uuid } from 'uuid'

import AutoMerge from "automerge"
import * as TejoSynchronizer from "tejosynchronizer"
import { AutoMergeSynchronizer, automergeSynchronizerFactory } from "./automerge_lib/AutoMergeSynchronizer"
import { BraidClientMessenger } from "./braid_lib/BraidMessenger"
import { parsers } from "./automerge_braid_utils";

type MyObj = fabric.Object & { id: string }
type DocType = {
  [objectID: string]: any
}

TejoSynchronizer.registerMessengerFactory(new URL("braid:"), (...args: any[]) => new BraidClientMessenger(args[0]))
TejoSynchronizer.registerSynchronizerFactory(new URL("automerge:"), automergeSynchronizerFactory)
parsers("automerge").forEach((parser) => TejoSynchronizer.registerMessageParser(...parser))

var canvasSynchronizer = (TejoSynchronizer.default.getSynchronizer(new URL("automerge:"), new URL("braid://localhost:8080/api/doc1"), AutoMerge.init()) as AutoMergeSynchronizer<DocType>)
canvasSynchronizer.sync()

function objectChanged(obj: MyObj) {
  canvasSynchronizer.resource = AutoMerge.change(canvasSynchronizer.resource, (doc) => {
    doc[obj.id] = obj.toObject()
  })

  console.log("changed object", canvasSynchronizer.resource)
}

function updateCanvas(canvas: fabric.Canvas, patch: AutoMerge.Patch) {
  // console.log("updating canvas with patch:", patch)

  Object.entries(patch.diffs.props).forEach((propEntry) => { // iterate through changed objects
    const objID = propEntry[0]
    const obj = canvasSynchronizer.resource[objID]

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

function synchronizeCanvas(canvas: fabric.Canvas) {

  console.log(canvas.toJSON())

  canvas.on("object:modified", (e) => { // notify peers
    objectChanged(e.target as MyObj)
  })

  canvas.on("before:path:created", (e) => {
    // @ts-ignore
    let o: fabric.Object = e.path;
    (o as MyObj).id = uuid()
    objectChanged(o as MyObj)
  })

  canvasSynchronizer.on("update", (patch: AutoMerge.Patch) => { // update canvas accordingly
    console.log("synchornizer patch", patch)
    if (patch)
      updateCanvas(canvas, patch)
  })

  return canvasSynchronizer
}


const App = () => {
  const [canvas, setCanvas] = useState<fabric.Canvas>((undefined as unknown as fabric.Canvas));

  const initCanvas = () =>
    new fabric.Canvas('canv', {
      centeredRotation: true,
      centeredScaling: true,
      fill: "blue",
      backgroundColor: 'white',
      isDrawingMode: false,
      width: window.screen.width * 3 / 4,
      height: window.screen.height * 3 / 4,
    });

  useEffect(() => {
    setCanvas(initCanvas());
  }, []);

  useEffect(
    () => {
      if (canvas) {
        synchronizeCanvas(canvas)
      }
    },
    [canvas]
  )

  const addShape = (e: any) => {
    let type: string = e.target.name;
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
      object && canvas.add(object)
      canvas.renderAll()
      objectChanged(object as MyObj)
    }
  };

  const toggleDraw = (e: any) => {
    canvas.isDrawingMode = !canvas.isDrawingMode
    console.log(canvas.isDrawingMode)
  }

  return (
    <div className='App'>
      <div>
        <div>
          <button type='button' onClick={toggleDraw}>
            Toggle drawing
           </button>
          <button type='button' name='circle' onClick={addShape}>
            Add a Circle
           </button>

          <button type='button' name='triangle' onClick={addShape}>
            Add a Triangle
           </button>

          <button type='button' name='rectangle' onClick={addShape}>
            Add a Rectangle
           </button>
        </div>
      </div>
      <div style={{ display: "flex", alignContent: "center", justifyContent: "center" }}>
        <canvas id='canv' style={{ borderColor: "black", borderStyle: "solid", borderRadius: "5px" }} />
      </div>
    </div>
  );
}

export default App;
