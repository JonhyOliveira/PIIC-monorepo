import winston, { level } from "winston"

const logger = winston.createLogger({
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
        new winston.transports.File({
            format: winston.format.combine(winston.format.timestamp(), winston.format.metadata(), winston.format.json()),
            filename: "all.log"
        })
    ]
})



const myFormat = winston.format.printf((info) => {
    return `${info.timestamp} ${info.level}: ${info.message}`;
});


if (process.env.NODE_ENV !== "production") {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), myFormat),
        level: "info",
    }))
}

export default logger

export const metricsLogger = winston.createLogger({
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
        new winston.transports.File({
            filename: "metrics.log",
            format: winston.format.combine(winston.format.timestamp(), winston.format.metadata(), winston.format.json())
        })
    ]
})

export const stream = {
    write: function (message: any, encoding: any) {
        logger.info(message)
    }
}