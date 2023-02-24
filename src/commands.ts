import * as path from "https://deno.land/std@0.177.0/path/mod.ts";
import { fileExists, TEMPLATE_FILE } from "./utils.ts";

type YargsHandlerArgs<T> = {
  [K in keyof T]: string;
};

export function createInitCommand(): [
  command: string,
  description: string,
  // deno-lint-ignore no-explicit-any
  config: Record<any, any>,
  // deno-lint-ignore no-explicit-any
  handler: (args: any) => void,
] {
  const config = {
    config: {},
  };

  const handler = async (args: YargsHandlerArgs<typeof config>) => {
    const configPath = path.resolve(Deno.cwd(), args.config);
    const configFileExists = await fileExists(
      configPath,
    );

    if (configFileExists) {
      console.log(
        `%c${args.config} already exists, refusing to override`,
        "color: red",
      );
      Deno.exit(1);
    } else {
      Deno.writeTextFileSync(configPath, TEMPLATE_FILE);
      console.log(`%cCreated ${args.config} from template`, "color: green");
      Deno.exit(0);
    }
  };

  return [
    "init",
    "create a config file from a template",
    config,
    handler,
  ];
}
