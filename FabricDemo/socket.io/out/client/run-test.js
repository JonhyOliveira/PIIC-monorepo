"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const canvas_tester_1 = require("./canvas-tester");
const yargs_1 = __importDefault(require("yargs"));
const logging_1 = __importDefault(require("../logging"));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const args = yargs_1.default
    .version("a melhor")
    .option("canvasHost", {
    type: "string",
    alias: "cH",
    default: "localhost:8080",
    description: "the machine and port where the canvas is hosted"
})
    .option("initClients", {
    type: "number",
    alias: "ic",
    default: 1,
    description: "number of initial clients to instantiate in this process."
})
    .option("tickTime", {
    type: "number",
    alias: "tT",
    default: 1500,
    description: "time between ticks. a tick performs some actions"
})
    .option("clientsCreatedByTick", {
    type: "number",
    alias: "ccT",
    default: 0,
    description: "how many clients are created by tick"
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
    .parseSync();
function simulateClient(client) {
    return __awaiter(this, void 0, void 0, function* () {
        // wait for network
        yield sleep(args.maximumThinkTime);
        // simulate user
        let waitScale = 1;
        while (true) {
            // get next action to execute
            let action = client.nextAction();
            logging_1.default.notice(`next action: ${action === null || action === void 0 ? void 0 : action.label}`);
            // think about next action
            yield sleep(waitScale * Math.floor(Math.random() * (args.maximumThinkTime - args.minimumThinkTime) + args.minimumThinkTime));
            if (action != null) {
                // wait for time to execute action
                let actionTime = 0;
                if (typeof action.actionTime == "number")
                    actionTime = action.actionTime;
                else if (typeof action.actionTime == "string")
                    actionTime = action.actionTime == "MAX" ? args.maximumActionTime : (action.actionTime == "MIN") ? args.minimumThinkTime : 0;
                yield sleep(waitScale * actionTime);
                // execute it
                yield action.execute();
                waitScale = 1 / action.nextPace;
            }
        }
    });
}
const canvasURL = new URL("braid://" + args.canvasHost + "/api/doc1");
const clients = [];
let expectedClients = args.initClients;
// create initial clients
for (let i = 0; i < args.initClients; i++) {
    let c = new canvas_tester_1.TestingCanvas(args.maxObjects, canvasURL);
    simulateClient(c);
    clients.push(c);
}
setInterval(() => {
    expectedClients += args.clientsCreatedByTick;
    while (Math.floor(expectedClients) > clients.length) {
        let c = new canvas_tester_1.TestingCanvas(args.maxObjects, canvasURL);
        simulateClient(c);
        clients.push(c);
    }
}, args.tickTime);
