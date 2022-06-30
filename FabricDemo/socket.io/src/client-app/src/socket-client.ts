import io from 'socket.io-client'
import { fabric } from 'fabric'
import { MyObj } from './App'

const socket = io("http://localhost:8080")

type Data = {
    obj: fabric.Object,
    id: string
}

// emitters
export const emitAdd = (obj: Data) => {
    socket.emit('object-added', obj)
}

export const emitModify = (obj: Data) => {
    socket.emit('object-modified', obj)
}

export const emitRemove = (obj: Data) => {
    socket.emit('object-removed', obj)
}

// listeners
export const addObj = (canvas: fabric.Canvas) => {
    socket.off('new-add')
    socket.on('new-add', (data: Data) => {
        const { obj, id } = data
        console.log(obj)
        let object

        if (obj.type === 'rect') {
            object = new fabric.Rect({
                height: obj.height,
                width: obj.width,
            })
        } else if (obj.type === 'circle') {
            object = new fabric.Circle({
                radius: (obj as fabric.Circle).radius,
            })
        } else if (obj.type === 'triangle') {
            object = new fabric.Triangle({
                width: obj.width,
                height: obj.height,
            })
        } else if (obj.type === "path") {
            object = new fabric.Path(

            )
        }

        if (object) {
            (object as MyObj).id = id
            object && canvas.add(object)
            canvas.renderAll()
        }
    })
}

export const modifyObj = (canvas: fabric.Canvas) => {
    socket.on('new-modification', (data: Data) => {
        const { obj, id } = data
        console.log(obj)
        let object = canvas.getObjects().find(object => (object as MyObj).id === id)

        if (object) {
            object.set(obj)
            object.setCoords()
            canvas.renderAll()
        }
    })
}

export const removeObj = (canvas: fabric.Canvas) => {
    socket.on('new-remove', (data: Data) => {
        const { obj, id } = data

        let object = canvas.getObjects().find(object => (object as MyObj).id === id)
        if (object) {
            canvas.remove(object)
            canvas.renderAll()
        }
    })
}

export default socket