export type ConfigFile = Record<
  "files",
  Config[]
>;

export type Config = {
  template: string;
  output: string;
  "allow-empty": string[] | undefined;
  "force-prompt-on-create": string[] | undefined;
};
