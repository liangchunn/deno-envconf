import yargs from "https://deno.land/x/yargs@v17.7.1-deno/deno.ts";
import { create } from "./create.ts";
import { update } from "./update.ts";
import { getConfig, outputFileExists } from "./utils.ts";
import { createInitCommand } from "./commands.ts";

async function main() {
  const args = await yargs(Deno.args)
    .command(...createInitCommand())
    .option("config", {
      alias: "c",
      type: "string",
      description: ".toml config file",
      default: "envconf.toml",
    })
    .demandOption("config")
    .strictCommands()
    .parse();

  const configPath = args.config;
  const { resolvedConfigPath, parsedConfigs } = await getConfig(configPath);
  for (const config of parsedConfigs) {
    const exists = await outputFileExists(resolvedConfigPath, config);
    if (exists) {
      await update(resolvedConfigPath, config);
    } else {
      await create(resolvedConfigPath, config);
    }
  }
}

main();
