// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — NETWORK EGRESS GUARD (SSRF DEFENCE)
//
// Several features fetch URLs supplied by the user or by a model: research,
// page extraction, link analysis. Without a guard, those fetches can reach the
// loopback interface, private networks, cloud metadata endpoints
// (169.254.169.254) and internal admin services.
//
// The guard validates:
//   • scheme           — http/https only
//   • hostname         — rejects localhost and internal suffixes
//   • resolved IPs     — rejects loopback / private / link-local / reserved
//   • redirects        — each hop is re-validated, with a hop cap
//   • response size    — bounded body read
//   • time             — bounded by AbortSignal
//
// DNS is resolved before connecting, which closes the "resolve to a public IP,
// then rebind" class of bypass for the common case. A determined attacker can
// still win a race with DNS rebinding; deployments that need that guarantee
// should also enforce an egress firewall (documented in the runbook).
// ══════════════════════════════════════════════════════════════════════

import dns from "dns";
import net from "net";

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
]);

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".localdomain", ".home.arpa"];

/** IPv4 ranges that must never be reached from a user-supplied URL. */
const BLOCKED_V4: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],   // CGNAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],  // link-local + cloud metadata
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],     // multicast
  ["240.0.0.0", 4],     // reserved
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    value = value * 256 + n;
  }
  return value;
}

function isBlockedIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value === null) return true;
  for (const [base, bits] of BLOCKED_V4) {
    const baseValue = ipv4ToInt(base);
    if (baseValue === null) continue;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    if ((value & mask) === (baseValue & mask)) return true;
  }
  return false;
}

/**
 * Parse an IPv6 address to its eight 16-bit groups. Handles `::` compression
 * and a trailing IPv4 form. Returns null when the address is malformed.
 */
function ipv6Groups(ip: string): number[] | null {
  let address = ip.split("%")[0]; // drop zone id

  // A trailing IPv4 part (e.g. ::ffff:127.0.0.1) becomes two 16-bit groups.
  const lastColon = address.lastIndexOf(":");
  const tail = address.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = tail.split(".").map(Number);
    if (v4.length !== 4 || v4.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    address = address.slice(0, lastColon + 1) + ((v4[0] << 8) | v4[1]).toString(16) + ":" + ((v4[2] << 8) | v4[3]).toString(16);
  }

  const [head, rest] = address.includes("::") ? address.split("::") : [address, undefined];
  const headParts = head ? head.split(":").filter(Boolean) : [];
  const restParts = rest ? rest.split(":").filter(Boolean) : [];

  const total = headParts.length + restParts.length;
  if (rest === undefined && total !== 8) return null;
  if (total > 8) return null;

  const fill = new Array(8 - total).fill("0");
  const parts = [...headParts, ...fill, ...restParts];
  if (parts.length !== 8) return null;

  const groups = parts.map((p) => parseInt(p, 16));
  if (groups.some((g) => !Number.isInteger(g) || g < 0 || g > 0xffff)) return null;
  return groups;
}

function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower.startsWith("fe80")) return true;          // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
  if (lower.startsWith("ff")) return true;            // multicast

  const g = ipv6Groups(lower);
  if (!g) return true; // unparseable → treat as unsafe

  const allZeroPrefix = g.slice(0, 5).every((x) => x === 0);

  // Unspecified (::) and loopback (::1)
  if (g.every((x) => x === 0)) return true;
  if (allZeroPrefix && g[5] === 0 && g[6] === 0 && g[7] === 1) return true;

  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d).
  // `new URL()` normalises these to hex groups (e.g. ::ffff:7f00:1), so the
  // comparison must be numeric rather than textual.
  if (allZeroPrefix && (g[5] === 0xffff || g[5] === 0)) {
    const v4 = `${(g[6] >> 8) & 0xff}.${g[6] & 0xff}.${(g[7] >> 8) & 0xff}.${g[7] & 0xff}`;
    if (isBlockedIpv4(v4)) return true;
  }

  return false;
}

export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isBlockedIpv4(ip);
  if (net.isIPv6(ip)) return isBlockedIpv6(ip);
  return true;
}

/**
 * Validate a URL's scheme, hostname and literal address.
 * Does NOT resolve DNS — use `assertSafeUrl` for that.
 */
export function checkUrlSyntax(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError("Invalid URL.");
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new SsrfError("Only http and https URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new SsrfError("URLs with embedded credentials are not allowed.");
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) throw new SsrfError("URL has no host.");

  if (BLOCKED_HOSTNAMES.has(host)) {
    throw new SsrfError("This host is not allowed.");
  }
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new SsrfError("This host is not allowed.");
  }
  // A literal IP in the URL is checked directly.
  if (net.isIP(host) && isBlockedIp(host)) {
    throw new SsrfError("This address is not allowed.");
  }

  return url;
}

/** Validate a URL and every address its hostname resolves to. */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  const url = checkUrlSyntax(rawUrl);
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (net.isIP(host)) return url; // already checked synchronously

  let addresses: string[];
  try {
    const records = await dns.promises.lookup(host, { all: true, verbatim: true });
    addresses = records.map((r) => r.address);
  } catch {
    throw new SsrfError("Could not resolve this host.");
  }

  if (addresses.length === 0) throw new SsrfError("Could not resolve this host.");
  for (const address of addresses) {
    if (isBlockedIp(address)) {
      throw new SsrfError("This host resolves to a private or reserved address.");
    }
  }

  return url;
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
}

export interface SafeFetchResult {
  status: number;
  url: string;
  contentType: string;
  text: string;
  bytes: number;
}

/**
 * Fetch a user-supplied URL with SSRF protection, redirect re-validation, a
 * size cap and a hard timeout.
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const { timeoutMs = 15000, maxBytes = 2_000_000, maxRedirects = 3 } = options;

  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = await assertSafeUrl(current);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "LikewayAI/1.0 (+https://likeway.ai)",
          Accept: "text/html,application/xhtml+xml,application/json,text/plain;q=0.9",
          ...options.headers,
        },
      });
    } catch (err: any) {
      clearTimeout(timer);
      if (err?.name === "AbortError") throw new SsrfError("The request timed out.");
      throw new SsrfError("The request failed.");
    } finally {
      clearTimeout(timer);
    }

    // Follow redirects manually so each hop is re-validated.
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new SsrfError("Redirect without a destination.");
      current = new URL(location, url).toString();
      continue;
    }

    const contentType = res.headers.get("content-type") || "";
    const reader = res.body?.getReader();
    let bytes = 0;
    const chunks: Uint8Array[] = [];

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) {
          await reader.cancel().catch(() => {});
          throw new SsrfError("The response is too large.");
        }
        chunks.push(value);
      }
    }

    const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    return {
      status: res.status,
      url: url.toString(),
      contentType,
      text: buffer.toString("utf8"),
      bytes,
    };
  }

  throw new SsrfError("Too many redirects.");
}
