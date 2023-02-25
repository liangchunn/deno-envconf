# deno-envconf

An interactive command line interface for setting up and syncing env files based
on a template.

## Usage

### Requirements

- [Deno v1.30.3](https://deno.land/manual@v1.30.3/getting_started/installation)

```sh
# create or sync environment variable files from template
deno run --allow-read --allow-write --allow-env https://deno.land/x/envconf/src/mod.ts
```

### Configuration

```sh
# create a new config file
deno run --allow-read --allow-write --allow-env https://deno.land/x/envconf/src/mod.ts init
```

| Field                    | Type                        | Description                                                                                                                |
| ------------------------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `template`               | `string`                    | Template env file to create from. This can contain default values, which will be copied on create as-is                    |
| `output`                 | `string`                    | The resulting output env file                                                                                              |
| `allow-empty`            | <code>string[] &#124; undefined</code> | Environment variable keys that can be empty. When creating a new env file from the template, it will populate it as empty. |
| `force-prompt-on-create` | <code>string[] &#124; undefined</code> | Keys that are forced to be prompted for on creation, regardless of if it's pre-filled or not.                              |

> Note: To specify multiple configurations, copy the entire `[[file]]` section
> Note: `template` and `output` is relative to the configuration file

## Development

```sh
deno task dev
```
