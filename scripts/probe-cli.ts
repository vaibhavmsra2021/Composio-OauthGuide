// Usage:
//   npm run probe -- discovery https://accounts.google.com
//   npm run probe -- authorize https://github.com/login/oauth/authorize [scope=repo]
//   npm run probe -- url https://api.slack.com/apps
import { checkUrl, fetchDiscovery, probeAuthorize } from "../lib/probe";

const [cmd, target, ...rest] = process.argv.slice(2);
const extra = Object.fromEntries(rest.map((kv) => kv.split("=", 2) as [string, string]));

async function main() {
  if (!cmd || !target) {
    console.error("usage: probe <discovery|authorize|url> <url> [k=v ...]");
    process.exit(2);
  }
  const r =
    cmd === "discovery" ? await fetchDiscovery(target) : cmd === "authorize" ? await probeAuthorize(target, extra) : await checkUrl(target);
  console.log(JSON.stringify(r, null, 2));
}
main();
