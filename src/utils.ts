import * as path from "https://deno.land/std@0.177.0/path/mod.ts";
import * as dotenv from "https://deno.land/std@0.177.0/dotenv/mod.ts";
import * as toml from "https://deno.land/std@0.177.0/encoding/toml.ts";
import { z } from "https://deno.land/x/zod@v3.20.5/mod.ts";
import { Config, ConfigFile } from "./types.ts";

export async function readTemplateFile(
  resolvedConfigPath: string,
  config: Config,
) {
  const resolvedTemplatePath = path.resolve(
    resolvedConfigPath,
    "..",
    config.template,
  );
  const templateFileContents = await Deno.readTextFile(resolvedTemplatePath);
  const templateEnvs = dotenv.parse(templateFileContents);

  const templateRelativePath = path.relative(Deno.cwd(), resolvedTemplatePath);

  return {
    templateFileContents,
    templateEnvs,
    templateRelativePath,
  };
}

export function getOutputFilePath(resolvedConfigPath: string, config: Config) {
  return path.resolve(
    resolvedConfigPath,
    "..",
    config.output,
  );
}

export async function outputFileExists(
  resolvedConfigPath: string,
  config: Config,
) {
  return await fileExists(getOutputFilePath(resolvedConfigPath, config));
}

/**
 * Checks if all template files defined in the config exists
 */
export async function checkTemplateFiles(
  resolvedConfigPath: string,
  configs: Config[],
) {
  for (const config of configs) {
    const resolvedTemplatePath = path.resolve(
      resolvedConfigPath,
      "..",
      config.template,
    );
    const templateRelativePath = path.relative(
      Deno.cwd(),
      resolvedTemplatePath,
    );
    if (await fileExists(resolvedTemplatePath)) {
      continue;
    } else {
      console.error(
        `%cTemplate file '${templateRelativePath}' does not exist`,
        "color: red",
      );
      Deno.exit(1);
    }
  }
}

export async function fileExists(filename: string): Promise<boolean> {
  return await Deno.stat(filename).then((info) => info.isFile).catch(() =>
    false
  );
}

export async function readOutputFile(
  resolvedConfigPath: string,
  config: Config,
) {
  const resolvedOutputPath = path.resolve(
    resolvedConfigPath,
    "..",
    config.output,
  );
  const outputFileContents = await Deno.readTextFile(resolvedOutputPath);
  const outputEnvs = dotenv.parse(outputFileContents);

  const outputRelativePath = path.relative(Deno.cwd(), resolvedOutputPath);

  return {
    outputFileContents,
    outputEnvs,
    outputRelativePath,
  };
}

export async function getConfig(configPathRelative: string) {
  const resolvedConfigPath = path.resolve(Deno.cwd(), configPathRelative);
  const configFileExists = await fileExists(resolvedConfigPath);
  if (configFileExists) {
    const configFileContents = await Deno.readTextFile(resolvedConfigPath);
    const parsedConfigFile = parseToml<ConfigFile>(configFileContents);
    validateConfigFile(parsedConfigFile);
    await checkTemplateFiles(resolvedConfigPath, parsedConfigFile.files);
    return {
      resolvedConfigPath,
      parsedConfigs: parsedConfigFile.files,
    };
  } else {
    console.error(`%c'${configPathRelative}' does not exist`, "color: red");
    Deno.exit(1);
  }
}

function parseToml<T>(raw: string): T {
  try {
    return toml.parse(raw) as T;
  } catch (e) {
    console.error("%cInvalid toml in config file", "color: red");
    console.error(e);
    Deno.exit(1);
  }
}

const configFileSchema = z.object({
  files: z.array(z.object({
    template: z.string(),
    output: z.string(),
    "allow-empty": z.optional(z.array(z.string())),
    "force-prompt-on-create": z.optional(z.array(z.string())),
  })),
});

/**
 * Validates a config file, checking if the types are correct
 * and there are no duplicate templates or outputs
 */
function validateConfigFile(configFile: ConfigFile) {
  try {
    configFileSchema.parse(configFile);
    const templates = configFile.files.map((file) => file.template);
    const outputs = configFile.files.map((file) => file.output);
    const uniqueTemplateFiles = new Set(
      templates,
    );
    const uniqueOutputFiles = new Set(
      outputs,
    );
    if (
      templates.length !== uniqueTemplateFiles.size ||
      outputs.length !== uniqueOutputFiles.size
    ) {
      console.error(
        "%cTemplates and outputs in the config file must be unique",
        "color: red",
      );
      Deno.exit(1);
    }
  } catch (e) {
    console.error("%cInvalid config file", "color: red");
    console.error(e);
    Deno.exit(1);
  }
}

export const TEMPLATE_FILE = `
[[files]]
template = ""
output = ""
allow-empty = []
force-prompt-on-create = []
`.trimStart();
