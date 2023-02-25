import { getOutputFilePath, readTemplateFile } from "./utils.ts";
import { Config } from "./types.ts";
import Ask from "ask/mod.ts";
import { PromptOpts } from "ask/src/core/prompt.ts";
import { Result } from "ask/src/core/result.ts";

export async function create(resolvedConfigPath: string, config: Config) {
  const allowedEmptyKeys = config["allow-empty"] ?? [];
  const forcedPromptKeys = config["force-prompt-on-create"] ?? [];
  const { templateEnvs, templateFileContents, templateRelativePath } =
    await readTemplateFile(resolvedConfigPath, config);
  // get all env vars which are unpopulated in the env file OR matches the overrides
  // and ignore the keys which should be left empty by default
  const envVarKeys = Object.entries(templateEnvs)
    .filter(
      ([key, value]) =>
        (value === "" || forcedPromptKeys.includes(key)) &&
        !allowedEmptyKeys.includes(key),
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
    default: forcedPromptKeys.includes(envVar)
      ? templateEnvs[envVar]
      : undefined,
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
