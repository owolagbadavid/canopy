import pino from "pino";

const isProd = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL || (isProd ? "info" : "debug");

export const logger = pino(
  isProd
    ? { level }
    : {
        level,
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
        },
      },
);

export type Logger = pino.Logger;
