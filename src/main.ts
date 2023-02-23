import yargs from "https://deno.land/x/yargs@v17.7.1-deno/deno.ts";
import * as path from "https://deno.land/std@0.177.0/path/mod.ts";
import * as toml from "https://deno.land/std@0.177.0/encoding/toml.ts";
import * as dotenv from "https://deno.land/std@0.177.0/dotenv/mod.ts";
import Ask from "https://deno.land/x/ask@1.0.6/mod.ts";
import { PromptOpts } from "https://deno.land/x/ask@1.0.6/src/core/prompt.ts";
import { Result } from "https://deno.land/x/ask@1.0.6/src/core/result.ts";
// import { Input } from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";

type ConfigFile = Record<
  "files",
  {
    template: string;
    output: string;
    "allow-empty": string[] | undefined;
    "force-prompt-on-create": string[] | undefined;
  }[]
>;

const TEMPLATE_FILE = `
[[files]]
template = ""
output = ""
allow-empty = []
force-prompt-on-create = []
`;

async function main() {
  const args = await yargs(Deno.args)
    .option("config", {
      alias: "c",
      type: "string",
      description: ".toml config file",
      default: "envconf.toml",
    })
    .command("init", "create an envconf.toml file from a template", () => {
      try {
        Deno.statSync(path.resolve(Deno.cwd(), "envconf.toml"));
        console.log(
          "%cenvconf.toml already exists, refusing to override",
          "color: red",
        );
        Deno.exit(1);
      } catch (_) {
        Deno.writeTextFileSync("./envconf.toml", TEMPLATE_FILE.trimStart());
        console.log("%cCreated envconf.toml from template", "color: green");
        Deno.exit(0);
      }
    })
    .demandOption("config")
    .strictCommands()
    .parse();

  const configPath = args.config;
  const resolvedConfigPath = path.resolve(Deno.cwd(), configPath);
  try {
    Deno.statSync(resolvedConfigPath);
  } catch (_) {
    console.error(`%c${configPath} does not exist`, "color: red");
    Deno.exit(1);
  }
  const configFile = await Deno.readTextFile(resolvedConfigPath);
  const parsedConfigFile = toml.parse(configFile) as ConfigFile;
  const configs = parsedConfigFile.files;
  for (const config of configs) {
    const ignoreKeys = config["allow-empty"] ?? [];
    const forcedKeys = config["force-prompt-on-create"] ?? [];
    const outputFilePath = path.resolve(
      resolvedConfigPath,
      "..",
      config.output,
    );
    const exists = existsSync(outputFilePath);
    const relativePath = path.relative(Deno.cwd(), outputFilePath);
    if (exists) {
      const templateFilePath = path.resolve(
        resolvedConfigPath,
        "..",
        config.template,
      );
      const templateFileContents = Deno.readTextFileSync(templateFilePath);
      const outputFileContents = Deno.readTextFileSync(outputFilePath);
      const parsedTemplateEnv = dotenv.parse(templateFileContents);
      const parsedOutputEnv = dotenv.parse(outputFileContents);
      // if there's a template env which doesn't exist in the output env
      const keysNotInOutput = Object.keys(parsedTemplateEnv).filter(
        (x) => !Object.keys(parsedOutputEnv).includes(x),
      );
      /**
       * handled cases:
       * 1. template has an env var which is supposed to be filled out
       * 2. template has an env var with the default value but not filled out
       * 3. template has an env var which is "allow-empty" but not existing in .env
       */
      if (keysNotInOutput.length) {
        console.log(
          `%c${config.output} is missing ${keysNotInOutput.length} environment variables.`,
          "color: yellow",
        );
        const questions: PromptOpts[] = keysNotInOutput.map((envVar) => {
          const isAllowEmpty = ignoreKeys.includes(envVar);
          const defaultValue = parsedTemplateEnv[envVar];
          if (isAllowEmpty) {
            return {
              message:
                `Populate ${envVar} with the default value (empty string)?`,
              name: envVar,
              type: "confirm",
            };
          } else {
            return {
              message: `Enter the value for ${envVar}:`,
              name: envVar,
              type: "input",
              // default: defaultValue.length ? defaultValue : undefined,
            };
          }
        });
        const ask = new Ask();
        const answers = await ask.prompt(questions);
        // update the output file
        const outputFile = updateExistingOutput(outputFileContents, answers);
        Deno.writeTextFileSync(outputFilePath, outputFile);
        console.log(`%cSuccessfully updated ${relativePath}`, "color: green");
      } else {
        console.log(
          `%c${relativePath} is synced with its template`,
          "color: gray",
        );
      }
    } else {
      const templateFilePath = path.resolve(
        resolvedConfigPath,
        "..",
        config.template,
      );
      const templateFileContents = Deno.readTextFileSync(templateFilePath);
      const envVars = dotenv.parse(templateFileContents);
      // get all env vars which are unpopulated in the env file OR matches the overrides
      // and ignore the keys which should be left empty by default
      const envVarKeys = Object.entries(envVars)
        .filter(
          ([key, value]) =>
            (value === "" || forcedKeys.includes(key)) &&
            !ignoreKeys.includes(key),
        )
        .map(([key]) => key);
      const templateRelativePath = path.relative(Deno.cwd(), templateFilePath);
      console.log(
        `%cConfiguring env from ${templateRelativePath}`,
        "color: cyan",
      );
      const questions: PromptOpts[] = envVarKeys.map((envVar) => ({
        message: `Enter the value for ${envVar}:`,
        name: envVar,
        type: "input",
        // show forcedKeys's default value if available
        // default: forcedKeys.includes(envVar) ? envVars[envVar] : undefined,
      }));
      const ask = new Ask();
      const answers = await ask.prompt(questions);
      const outputFile = populateTemplate(templateFileContents, answers);
      Deno.writeTextFileSync(outputFilePath, outputFile);
      console.log(`%cSuccessfully created ${relativePath}\n`, "color: green");
    }
  }
}

function populateTemplate(
  templateString: string,
  variables: Result<string | number | boolean | undefined>,
) {
  let sink = templateString;

  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`${key}=(.*)`);
    sink = sink.replace(pattern, `${key}=${value}`);
  }

  return sink;
}

function updateExistingOutput(
  outputString: string,
  variables: Result<string | number | boolean | undefined>,
) {
  let sink = outputString.trim();
  sink += "\n";
  for (const [key, value] of Object.entries(variables)) {
    // if the value is a boolean and is true, it means that we want to populate the default empty value
    if (typeof value === "boolean") {
      if (value === true) {
        sink += `${key}=\n`;
      }
    } else {
      sink += `${key}=${value}\n`;
    }
  }
  return sink;
}

function existsSync(filename: string): boolean {
  try {
    Deno.statSync(filename);
    return true;
  } catch (_) {
    return false;
  }
}

main();
