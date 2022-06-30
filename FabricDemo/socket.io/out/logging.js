"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stream = exports.metricsLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const logger = winston_1.default.createLogger({
    levels: {
        emerg: 0,
        alert: 1,
        crit: 2,
        error: 3,
        warning: 4,
        notice: 5,
        info: 6,
        debug: 7
    },
    transports: [
        new winston_1.default.transports.File({
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.metadata(), winston_1.default.format.json()),
            filename: "all.log"
        })
    ]
});
const myFormat = winston_1.default.format.printf((info) => {
    return `${info.timestamp} ${info.level}: ${info.message}`;
});
if (process.env.NODE_ENV !== "production") {
    logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.colorize(), myFormat),
        level: "info",
    }));
}
exports.default = logger;
exports.metricsLogger = winston_1.default.createLogger({
    levels: {
        emerg: 0,
        alert: 1,
        crit: 2,
        error: 3,
        warning: 4,
        notice: 5,
        info: 6,
        debug: 7
    },
    transports: [
        new winston_1.default.transports.File({
            filename: "metrics.log",
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.metadata(), winston_1.default.format.json())
        })
    ]
});
exports.stream = {
    write: function (message, encoding) {
        logger.info(message);
    }
};
