import "dotenv/config";
import { runOnce } from "./scheduler";
import { logger } from "./utils/logger";

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  const summary = await runOnce(projectRoot);

  logger.info("Run completed.", summary);
}

main().catch((error: unknown) => {
  logger.error("Travel alert run failed.", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

