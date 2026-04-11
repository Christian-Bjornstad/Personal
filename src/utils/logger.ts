type LogLevel = "INFO" | "WARN" | "ERROR";

function write(level: LogLevel, message: string, meta?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;

  if (meta === undefined) {
    console.log(`${prefix} ${message}`);
    return;
  }

  console.log(`${prefix} ${message}`, meta);
}

export const logger = {
  info(message: string, meta?: unknown): void {
    write("INFO", message, meta);
  },
  warn(message: string, meta?: unknown): void {
    write("WARN", message, meta);
  },
  error(message: string, meta?: unknown): void {
    write("ERROR", message, meta);
  }
};

