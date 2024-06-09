const esbuild = require("esbuild");

esbuild.build({
  entryPoints: ["src/ts/main.ts", "src/ts/sw.ts"],
  bundle: true,
  outdir: "public",
  logLevel: "info",  // This will show detailed build information
}).catch(() => process.exit(1));
