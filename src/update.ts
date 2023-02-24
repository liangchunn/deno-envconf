import Ask from "https://deno.land/x/ask@1.0.6/mod.ts";
import { PromptOpts } from "https://deno.land/x/ask@1.0.6/src/core/prompt.ts";
import { Result } from "https://deno.land/x/ask@1.0.6/src/core/result.ts";
import { Config } from "./types.ts";
import {
  getOutputFilePath,
  readOutputFile,
  readTemplateFile,
} from "./utils.ts";

export async function update(resolvedConfigPath: string, config: Config) {
  const ignoreKeys = config["allow-empty"] ?? [];
  const { templateEnvs } = await readTemplateFile(resolvedConfigPath, config);
  const { outputEnvs, outputFileContents, outputRelativePath } =
    await readOutputFile(
      resolvedConfigPath,
      config,
    );
  // if there's a template env which doesn't exist in the output env
  const keysNotInOutput = Object.keys(templateEnvs).filter(
    (x) => !Object.keys(outputEnvs).includes(x),
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
      const defaultValue = templateEnvs[envVar];
      if (isAllowEmpty) {
        return {
          message: `Populate ${envVar} with the default value (empty string)?`,
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
    await Deno.writeTextFile(
      getOutputFilePath(resolvedConfigPath, config),
      outputFile,
    );
    console.log(`%cSuccessfully updated ${outputRelativePath}`, "color: green");
  } else {
    console.log(
      `%c${outputRelativePath} is synced with its template`,
      "color: gray",
    );
  }
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
