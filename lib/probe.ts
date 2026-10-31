// Live, non-destructive probes of a provider's OAuth surface. These are the
// "setup attempts" an agent can make without a developer account: nothing here
// creates resources or authenticates. Results are recorded verbatim so a guide can
// cite them as "tested" evidence.

const UA = "oauth-guide-probe/0.1 (+https://github.com/; read-only OAuth setup research)";
const TIMEOUT_MS = 12_000;
const SNIPPET_CHARS = 600;

export const PROBE_CLIENT_ID = "oauth-guide-probe-nonexistent-client";
export const PROBE_REDIRECT = "https://example.com/oauth/callback";

export type ProbeResult = {
  kind: "discovery" | "authorize" | "url";
  url: string;
  ok: boolean;
  status?: number;
  // Redirect target with query string kept (it often carries error=... from the provider).
  location?: string;
  finalUrl?: string;
  title?: string;
  snippet?: string;
  data?: Record<string, unknown>;
  error?: string;
  at: string;
};

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { "user-agent": UA, accept: "text/html,application/json;q=0.9,*/*;q=0.8", ...init.headers },
    });
  } finally {
    clearTimeout(t);
  }
}

function textSnippet(body: string): { title?: string; snippet: string } {
  const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim().replace(/\s+/g, " ");
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { title, snippet: text.slice(0, SNIPPET_CHARS) };
}

function assertPublicHttps(raw: string): URL {
  const u = new URL(raw);
  if (u.protocol !== "https:") throw new Error("only https URLs are probed");
  const host = u.hostname;
  if (
    host === "localhost" ||
    /^(127|10|0)\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    host.endsWith(".internal") ||
    host.includes(":")
  ) {
    throw new Error("refusing to probe a private or local address");
  }
  return u;
}

/** Fetch OIDC / OAuth authorization-server metadata for an issuer or a full metadata URL. */
export async function fetchDiscovery(issuerOrUrl: string): Promise<ProbeResult> {
  const at = new Date().toISOString();
  const candidates = issuerOrUrl.includes("/.well-known/")
    ? [issuerOrUrl]
    : [
        issuerOrUrl.replace(/\/$/, "") + "/.well-known/openid-configuration",
        issuerOrUrl.replace(/\/$/, "") + "/.well-known/oauth-authorization-server",
      ];
  let last: ProbeResult | undefined;
  for (const url of candidates) {
    try {
      assertPublicHttps(url);
      const res = await fetchWithTimeout(url, { headers: { accept: "application/json" } });
      const body = await res.text();
      let json: Record<string, unknown> | undefined;
      try {
        json = JSON.parse(body);
      } catch {
        /* not JSON */
      }
      if (res.ok && json && typeof json === "object" && json.authorization_endpoint) {
        const pick = (k: string) => json![k];
        return {
          kind: "discovery",
          url,
          ok: true,
          status: res.status,
          at,
          data: {
            issuer: pick("issuer"),
            authorization_endpoint: pick("authorization_endpoint"),
            token_endpoint: pick("token_endpoint"),
            revocation_endpoint: pick("revocation_endpoint"),
            registration_endpoint: pick("registration_endpoint"),
            code_challenge_methods_supported: pick("code_challenge_methods_supported"),
            grant_types_supported: pick("grant_types_supported"),
            response_types_supported: pick("response_types_supported"),
            token_endpoint_auth_methods_supported: pick("token_endpoint_auth_methods_supported"),
            scopes_supported: Array.isArray(pick("scopes_supported"))
              ? (pick("scopes_supported") as unknown[]).slice(0, 40)
              : undefined,
          },
        };
      }
      last = { kind: "discovery", url, ok: false, status: res.status, at, ...textSnippet(body) };
    } catch (e) {
      last = { kind: "discovery", url, ok: false, at, error: (e as Error).message };
    }
  }
  return last!;
}

/**
 * Hit an authorization endpoint with a deliberately invalid client_id and observe how
 * the provider responds. Confirms the endpoint is live and shows the error a developer
 * would see for a misconfigured client (useful for the "blockers" section).
 */
export async function probeAuthorize(
  authorizationUrl: string,
  extraParams: Record<string, string> = {},
): Promise<ProbeResult> {
  const at = new Date().toISOString();
  try {
    const u = assertPublicHttps(authorizationUrl);
    const params: Record<string, string> = {
      client_id: PROBE_CLIENT_ID,
      redirect_uri: PROBE_REDIRECT,
      response_type: "code",
      state: "probe",
      ...extraParams,
    };
    for (const [k, v] of Object.entries(params)) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    const res = await fetchWithTimeout(u.toString(), { redirect: "manual" });
    const location = res.headers.get("location") ?? undefined;
    const body = res.status >= 300 && res.status < 400 ? "" : await res.text();
    return {
      kind: "authorize",
      url: u.toString(),
      ok: true,
      status: res.status,
      location,
      at,
      ...(body ? textSnippet(body) : {}),
    };
  } catch (e) {
    return { kind: "authorize", url: authorizationUrl, ok: false, at, error: (e as Error).message };
  }
}

/** Check that a URL (docs page, developer console) resolves, and where it lands. */
export async function checkUrl(url: string): Promise<ProbeResult> {
  const at = new Date().toISOString();
  try {
    assertPublicHttps(url);
    const res = await fetchWithTimeout(url, { redirect: "follow" });
    const body = await res.text();
    return { kind: "url", url, ok: res.ok, status: res.status, finalUrl: res.url, at, ...textSnippet(body) };
  } catch (e) {
    return { kind: "url", url, ok: false, at, error: (e as Error).message };
  }
}
