import { TestingCanvas } from "./canvas-tester"
import yargs from "yargs"
import logger from "../logging"

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

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
    .option("minimumThinkTime", {
        type: "number",
        alias: "mtt",
        default: 10,
        description: "minimum think time between actions (miliseconds)"
    })
    .option("maximumThinkTime", {
        type: "number",
        alias: "Mtt",
        default: 3000,
        description: "maximum think time between actions (miliseconds)"
    })
    .option("minimumActionTime", {
        type: "number",
        alias: "mat",
        default: 300,
        description: "minimum time for action to be performed (miliseconds)"
    })
    .option("maximumActionTime", {
        type: "number",
        alias: "Mat",
        default: 1000,
        description: "maximum time for action to be performed (miliseconds)"
    })
    .help()
    .alias("help", "h")
    .parseSync()

const clients: TestingCanvas[] = []

async function simulateClient(client: TestingCanvas) {

    // wait for network
    await sleep(args.maximumThinkTime)

    // simulate user
    let waitScale = 1
    while (true) {

        // get next action to execute
        let action = client.nextAction()
        logger.notice(`next action: ${action?.label}`)

        // think about next action
        await sleep(waitScale * Math.floor(Math.random() * (args.maximumThinkTime - args.minimumThinkTime) + args.minimumThinkTime))

        if (action != null) {

            // wait for time to execute action
            let actionTime = 0
            if (typeof action.actionTime == "number")
                actionTime = action.actionTime
            else if (typeof action.actionTime == "string")
                actionTime = action.actionTime == "MAX" ? args.maximumActionTime : (action.actionTime == "MIN") ? args.minimumThinkTime : 0

            await sleep(waitScale * actionTime)

            // execute it
            await action.execute()

            waitScale = 1 / action.nextPace
        }

    }

}

const canvasURL = new URL("braid://localhost:8080/api/doc1")

// create initial clients
for (let i = 0; i < args.initClients; i++) {
    let c = new TestingCanvas(args.maxObjects, canvasURL)
    simulateClient(c)
    clients.push(c)
}