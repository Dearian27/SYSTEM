import esbuild from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";
import { builtinModules } from "node:module";
import path from "node:path";

const prod = process.argv[2] === "production";
const defaultPluginDir =
  "/Users/dfedy/Library/Mobile Documents/iCloud~md~obsidian/Documents/vault/.obsidian/plugins/system-engine";
const pluginDir = path.resolve(
  process.env.OBSIDIAN_PLUGIN_DIR?.trim() || defaultPluginDir
);

const copyStaticFilesPlugin = {
  name: "copy-static-files",
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length > 0) {
        return;
      }

      await mkdir(pluginDir, { recursive: true });
      await copyFile("manifest.json", path.join(pluginDir, "manifest.json"));
      await copyFile("versions.json", path.join(pluginDir, "versions.json"));
    });
  },
};

const context = await esbuild.context({
  entryPoints: ["main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    ...builtinModules,
    ...builtinModules.map((moduleName) => `node:${moduleName}`),
  ],
  format: "cjs",
  target: "es2022",
  platform: "node",
  sourcemap: prod ? false : "inline",
  logLevel: "info",
  outfile: path.join(pluginDir, "main.js"),
  plugins: [copyStaticFilesPlugin],
});

if (prod) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
