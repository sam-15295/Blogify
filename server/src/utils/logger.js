import pino from "pino";

const level = process.env.NODE_ENV === "test" ? "silent" : process.env.LOG_LEVEL || "info";

export const logger = pino({
  level,
  redact: ["req.headers.authorization", "req.headers.cookie", "res.headers['set-cookie']"],
  ...(process.env.NODE_ENV === "development" && {
    transport: { target: "pino-pretty", options: { colorize: true } },
  }),
});
