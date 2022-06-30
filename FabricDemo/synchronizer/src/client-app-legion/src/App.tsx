import "./App.css";
import React, { useState, useEffect } from 'react';
import { fabric } from 'fabric';
import { v1 as uuid } from 'uuid'

import * as TejoSynchronizer from "tejosynchronizer"
import { LegionResourceSynchronizer, legionSynchronizerFactory, LegionTypeDefs } from "./legionlib/LegionSynchronizer"
import { BraidClientMessenger } from "./braid_lib/BraidMessenger"
import { legionBraidMessageParsers } from "./utils-LegionAndBraid";

type MyObj = fabric.Object & { id: string }
type DocType = {
  [objectID: string]: any
}

// @ts-ignore
legionBraidMessageParsers.forEach(value => TejoSynchronizer.registerMessageParser(...value))
TejoSynchronizer.registerSynchronizerFactory(new URL("legion:"), legionSynchronizerFactory)
TejoSynchronizer.registerMessengerFactory(new URL("braid:"), (...args: any[]) => new BraidClientMessenger(args[0]))

LegionTypeDefs.define(require("./legionlib/crdtLib/deltaList").DELTA_List)
LegionTypeDefs.define(require("./legionlib/crdtLib/deltaCounter").DELTA_Counter)
LegionTypeDefs.define(require("./legionlib/crdtLib/deltaMap").DELTA_Map)

var resourceURI = new URL("legion:M:olah")
var resourceURL = new URL("braid://localhost:8080/api/M")
var canvasSynchronizer: LegionResourceSynchronizer = (TejoSynchronizer.default.getSynchronizer(resourceURI, ...(resourceURI.pathname.split(":")), resourceURL) as LegionResourceSynchronizer)

canvasSynchronizer.sync()

function objectChanged(obj: MyObj) {
  let o = obj.toObject()

  // @ts-ignore
  Object.keys(o).forEach((key) => canvasSynchronizer.resource.set(obj.id + "." + key, o[key])) // hacky way to use only one resource per canvas, otherwise
  // we would need to X resources for each object inside the canvas.

  console.log("changed object", canvasSynchronizer.resource.getValue())
}

function updateCanvas(canvas: fabric.Canvas, ...args: any[]) {
  // console.log("updating canvas with patch:", patch)

  /* We don't really know what changed with Legion CRDTs....
  
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
  })*/
  // we'll need to sync the whole canvas :/ (is there some way to prevent this? Other than re-writing Legion code..)

  // var canvasObjects = {} // local cache for objects to increase eficiency. at the end the size will be the size of
  // the set intersection of the canvas objects with the objects being synchronized, so should be OK in terms of complexity.

  let canvasObjects: { [objectID: string]: fabric.Object } = {}
  let incompleteObjects: { [objectID: string]: { [key: string]: any } } = {}

  // and synced 
  var map: [string, string[]][] = canvasSynchronizer.resource.getValue()

  map.forEach(x => {
    let objectID_key: string = x[0]

    let [objectID, key] = objectID_key.split(".")

    let value = x[1][0]

    console.log(objectID, key, value)

    // get canvas object
    if (canvasObjects[objectID]) {
      // @ts-ignore
      canvasObjects[objectID].set(key, value)
    }
    else { // does not exist
      let hit = canvas.getObjects().find((object) => (object as MyObj).id == objectID)

      if (!hit) {
        // first, cache entry        
        if (!incompleteObjects[objectID]) {
          incompleteObjects[objectID] = {}
        }

        let obj = incompleteObjects[objectID]
        obj[key] = value

        // the, try to create object
        if (obj.type === 'rect') {
          hit = new fabric.Rect()
        } else if (obj.type === 'circle') {
          hit = new fabric.Circle()
        } else if (obj.type === 'triangle') {
          hit = new fabric.Triangle()
        } else if (obj.type === "path" && obj.path) {
          hit = new fabric.Path(obj.path)
        }

        if (hit) { // object was created
          console.log("object created");
          (hit as MyObj).id = objectID

          // set entries found so far
          Object.entries(incompleteObjects[objectID]).forEach((entry) => {
            // @ts-ignore
            hit?.set(entry[0], entry[1])
          })

          delete incompleteObjects[objectID]

          canvas.add(hit);
          canvasObjects[objectID] = hit
        }
      } else {
        canvasObjects[objectID] = hit
        console.log("upsie dupsie:", objectID, key, value, incompleteObjects, canvasObjects)
      }


    }
    canvas.getObjects().forEach(object => {
      if ((object as MyObj).id == objectID) {
        // @ts-ignore
        object.set(key, value)
        canvasObjects[objectID] = object
      }
    })

  })

  Object.values(canvasObjects).forEach((fObject) => fObject.setCoords())
  canvas.renderAll()

}

function synchronizeCanvas(canvas: fabric.Canvas) {

  // console.log(canvas.toJSON())

  canvas.on("object:modified", (e) => { // notify peers
    objectChanged(e.target as MyObj)
  })

  canvas.on("before:path:created", (e) => {
    // @ts-ignore
    let o: fabric.Object = e.path;
    (o as MyObj).id = uuid()
    objectChanged(o as MyObj)
  })

  canvasSynchronizer.on("update", (...args: any[]) => { // update canvas accordingly
    console.log("synchornizer patch")

    updateCanvas(canvas)
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
