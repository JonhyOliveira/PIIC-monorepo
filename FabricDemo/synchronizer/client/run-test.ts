import SynchronizedCanvas from "./automerge-canvas-synchronizer"
import yargs from "yargs"

const args = yargs
    .version("a melhor")
    .option("initClients", {
        type: "number",
        alias: "ic",
        default: 1,
        description: "number of initial clients to instantiate in this process."
    })
    .option("maxObjects", {
        type: "number",
        alias: "mo",
        default: -1,
        description: "maximum number of objects. stops creating new objects at max."
    })
    .option("cyclems", {
        type: "number",
        alias: "cms",
        default: 1000,
        description: "how frequently to execute a cycle (in miliseconds)"
    })
    .option("cycleNOBjects", {
        type: "number",
        alias: "cno",
        default: 1,
        description: "how many objects are created per cycle"
    })
    .option("areCycleObjectPerClient", {
        type: "boolean",
        alias: "copc",
        default: false,
        description: "should the --cno flag specify objects to be created by client?"
            + " if false number of object will be distributed"
    })
    .option("cycleNClients", {
        type: "number",
        alias: "cnc",
        default: 0,
        description: "how many clients to create per cycle"
    })
    .help()
    .alias("help", "h")
    .parseSync()

const clients = []

// create initial clients
for (let i = 0; i < args.initClients; i++)
    clients.push(new SynchronizedCanvas())

// wait for sync