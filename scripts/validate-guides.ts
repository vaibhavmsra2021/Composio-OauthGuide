// Validates every guide JSON in data/guides against the schema and checks that
// every cited source id exists. Usage: npm run validate [-- path/to/guide.json]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Guide } from "../lib/schema";

const dir = join(process.cwd(), "data", "guides");
const files = process.argv[2] ? [process.argv[2]] : readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => join(dir, f));

let failed = 0;
for (const file of files) {
  const parsed = Guide.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    failed++;
    console.error(`FAIL ${file}\n${parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
    continue;
  }
  const g = parsed.data;
  const ids = new Set(g.sources.map((s) => s.id));
  const dangling: string[] = [];
  const visit = (v: unknown, path: string) => {
    if (Array.isArray(v)) v.forEach((x, i) => visit(x, `${path}[${i}]`));
    else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        if (k === "sources" && path !== "" && Array.isArray(x)) {
          for (const id of x) if (typeof id === "string" && !ids.has(id)) dangling.push(`${path}.sources -> ${id}`);
        } else visit(x, path ? `${path}.${k}` : k);
      }
    }
  };
  visit(g, "");
  const uncited = [...g.steps, ...g.gotchas].filter((x) => x.confidence !== "inferred" && x.sources.length === 0);
  if (dangling.length || uncited.length) {
    failed++;
    console.error(`FAIL ${file}`);
    dangling.forEach((d) => console.error(`  dangling source id: ${d}`));
    uncited.forEach((x) => console.error(`  "${"title" in x ? x.title : ""}" is ${x.confidence} but cites no source`));
  } else {
    console.log(`ok   ${file} (${g.steps.length} steps, ${g.sources.length} sources, ${g.checks.length} checks)`);
  }
}
process.exit(failed ? 1 : 0);
