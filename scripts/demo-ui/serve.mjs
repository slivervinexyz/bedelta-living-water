#!/usr/bin/env node
import * as esbuild from "esbuild";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const wasmShim = join(dir, "soil-wasm-shim.ts");
const port = Number(process.env.PORT || 4173);

const built = await esbuild.build({
  absWorkingDir: join(dir, "../.."),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  write: false,
  logLevel: "warning",
  entryPoints: [join(dir, "fw11-boot.ts")],
  plugins: [
    {
      name: "soil-wasm-browser-shim",
      setup(build) {
        build.onResolve({ filter: /soil-wasm-node$/ }, () => ({ path: wasmShim }));
      },
    },
  ],
});

const bootJs = built.outputFiles?.[0]?.text ?? "";
const html = readFileSync(join(dir, "index.html"), "utf8");

const server = createServer((req, res) => {
  const url = req.url?.split("?")[0] ?? "/";
  if (url === "/fw11-boot.js") {
    res.writeHead(200, { "content-type": "application/javascript; charset=utf-8" });
    res.end(bootJs);
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
});

server.listen(port, () => {
  console.log(`[demo:FW-11-ui] http://127.0.0.1:${port}/`);
});
