import { build, emptyDir } from "https://deno.land/x/dnt@0.30.0/mod.ts";

await emptyDir("./npm");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  shims: {
    deno: true,
    timers: true,
    weakRef: true,
  },
  compilerOptions: {
    lib: ["es2021", "dom"],
  },
  package: {
    name: "@myty/dispatch-queue",
    version: Deno.args[0].substring("refs/tags/v".length),
    description:
      "A dispatch queue with the ability to configure multiple queue processors.",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/myty/dispatch-queue.git",
    },
    bugs: {
      url: "https://github.com/myty/dispatch-queue/issues",
    },
  },
});

// post build steps
Deno.copyFileSync("LICENSE", "npm/LICENSE");
Deno.copyFileSync("README.md", "npm/README.md");
