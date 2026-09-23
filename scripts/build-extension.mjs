import * as esbuild from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const extDir = join(root, "src/extension");
const sdkEntry = join(root, "src/sdk/exomesh-agentic-wallet-guard/index.ts");
const wasmShim = join(extDir, "shims/soil-wasm-node.ts");

const soilWasmShimPlugin = {
  name: "soil-wasm-browser-shim",
  setup(build) {
    build.onResolve({ filter: /soil-wasm-node$/ }, () => ({ path: wasmShim }));
  },
};

const shared = {
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  logLevel: "info",
  plugins: [soilWasmShimPlugin],
  alias: {
    "@slivervine/exomesh-agentic-wallet-guard": sdkEntry,
  },
};

await esbuild.build({
  ...shared,
  entryPoints: [join(extDir, "content.ts")],
  outfile: join(extDir, "content.js"),
});

await esbuild.build({
  ...shared,
  entryPoints: [join(extDir, "popup.ts")],
  outfile: join(extDir, "popup.js"),
});

console.log("Extension bundle: src/extension/{content,popup}.js");
