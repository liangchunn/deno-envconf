import { getOutputFilePath, readTemplateFile } from "./utils.ts";
import { Config } from "./types.ts";
import { PromptOpts } from "https://deno.land/x/ask@1.0.6/src/core/prompt.ts";
import Ask from "https://deno.land/x/ask@1.0.6/mod.ts";
import { Result } from "https://deno.land/x/ask@1.0.6/src/core/result.ts";

export async function create(resolvedConfigPath: string, config: Config) {
  const ignoreKeys = config["allow-empty"] ?? [];
  const forcedKeys = config["force-prompt-on-create"] ?? [];
  const { templateEnvs, templateFileContents, templateRelativePath } =
    await readTemplateFile(resolvedConfigPath, config);
  // get all env vars which are unpopulated in the env file OR matches the overrides
  // and ignore the keys which should be left empty by default
  const envVarKeys = Object.entries(templateEnvs)
    .filter(
      ([key, value]) =>
        (value === "" || forcedKeys.includes(key)) &&
        !ignoreKeys.includes(key),
    )
    .map(([key]) => key);
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
  await Deno.writeTextFile(
    getOutputFilePath(resolvedConfigPath, config),
    outputFile,
  );
  console.log(
    `%cSuccessfully created ${templateRelativePath}\n`,
    "color: green",
  );
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
