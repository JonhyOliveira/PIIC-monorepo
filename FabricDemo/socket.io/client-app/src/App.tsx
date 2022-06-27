import "./App.css";
import React, { useState, useEffect } from 'react';
import { fabric } from 'fabric';
import { v1 as uuid } from 'uuid'
import { emitAdd, emitModify, modifyObj, addObj } from "./socket-client"

export type MyObj = fabric.Object & { id: string }

const App = () => {
  const [canvas, setCanvas] = useState<fabric.Canvas>((undefined as unknown as fabric.Canvas));

  const initCanvas = () =>
    new fabric.Canvas('canv', {
      centeredRotation: true,
      centeredScaling: true,
      fill: "blue",
      backgroundColor: 'white',
      isDrawingMode: true,
      width: window.screen.width * 3 / 4,
      height: window.screen.height * 3 / 4,
    });



  useEffect(() => {
    setCanvas(initCanvas());
  }, []);

  useEffect(
    () => {
      if (canvas) {
        canvas.on("path:created", function (options) {
          console.log("path created: ", options)

          // @ts-ignore
          var path: fabric.Path = options.path

          const createdObj = {
            obj: path,
            id: (options.target as MyObj).id
          }
          emitAdd(createdObj)
        })

        canvas.on('object:modified', function (options) {
          console.log("object modified: ", options)
          if (options.target) {
            const modifiedObj = {
              obj: options.target,
              id: (options.target as MyObj).id,
            }
            emitModify(modifiedObj)
          }
        })

        canvas.on('object:moving', function (options) {
          if (options.target) {
            const modifiedObj = {
              obj: options.target,
              id: (options.target as MyObj).id,
            }
            emitModify(modifiedObj)
          }
        })

        modifyObj(canvas)
        addObj(canvas)
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
      emitAdd({ obj: object, id: (object as MyObj).id })
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
