import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Guide } from "./schema";

// Curated guides ship with the repo (data/guides). Live-generated guides are stored in
// Vercel Blob when BLOB_READ_WRITE_TOKEN is set, otherwise on local disk (data/generated).
// On Vercel without Blob, the disk store falls back to /tmp and is not durable.

const CURATED_DIR = join(process.cwd(), "data", "guides");
const LOCAL_DIR = process.env.VERCEL ? "/tmp/generated" : join(process.cwd(), "data", "generated");
const BLOB_PREFIX = "guides/";
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

async function readDirGuides(dir: string): Promise<Guide[]> {
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const out: Guide[] = [];
  for (const f of files) {
    const parsed = Guide.safeParse(JSON.parse(await readFile(join(dir, f), "utf8")));
    if (parsed.success) out.push(parsed.data);
    else console.warn(`skipping invalid guide ${f}`);
  }
  return out;
}

async function readGenerated(): Promise<Guide[]> {
  if (!useBlob()) return readDirGuides(LOCAL_DIR);
  const { list, get } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: BLOB_PREFIX });
  const guides = await Promise.all(
    blobs.map(async (b) => {
      const res = await get(b.pathname, { access: "private" });
      if (!res) return undefined;
      const parsed = Guide.safeParse(JSON.parse(await new Response(res.stream).text()));
      return parsed.success ? parsed.data : undefined;
    }),
  );
  return guides.filter((g): g is Guide => Boolean(g));
}

export async function listGuides(): Promise<Guide[]> {
  const [curated, generated] = await Promise.all([readDirGuides(CURATED_DIR), readGenerated()]);
  const curatedSlugs = new Set(curated.map((g) => g.slug));
  return [...curated, ...generated.filter((g) => !curatedSlugs.has(g.slug))];
}

export async function getGuide(slug: string): Promise<Guide | undefined> {
  return (await listGuides()).find((g) => g.slug === slug);
}

export async function saveGenerated(guide: Guide): Promise<void> {
  const body = JSON.stringify(guide, null, 2);
  if (useBlob()) {
    const { put } = await import("@vercel/blob");
    await put(`${BLOB_PREFIX}${guide.slug}.json`, body, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(join(LOCAL_DIR, `${guide.slug}.json`), body);
}

/** Loose match of a user query ("gmail", "https://slack.com", "Google Workspace") to a library guide. */
export function matchGuide(guides: Guide[], query: string): Guide | undefined {
  const q = query.toLowerCase().trim();
  let host = "";
  try {
    host = new URL(q.startsWith("http") ? q : `https://${q}`).hostname.replace(/^www\./, "");
  } catch {
    /* not a URL */
  }
  const words = q.replace(/https?:\/\//, "").split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  return guides.find((g) => {
    const gHost = new URL(g.website).hostname.replace(/^www\./, "");
    if (host && host.includes(".") && (gHost === host || host.endsWith(`.${gHost}`))) return true;
    const hay = `${g.slug} ${g.name} ${g.provider}`.toLowerCase();
    return words.length > 0 && words.every((w) => hay.includes(w));
  });
}
