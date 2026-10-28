// ══════════════════════════════════════════════════════════════════════
// Unit tests for the pure security helpers.
//
// Run with:  node --test tests/
//
// The TypeScript sources are transpiled into a temporary directory with
// relative imports rewritten to .mjs, so the suite needs no test framework
// and no separate build step.
// ══════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const buildDir = path.join(here, ".test-build");

rmSync(buildDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });

/**
 * Transpile a project module and its local (./ or ../) TypeScript imports
 * into `tests/.test-build`, returning the importable module URL.
 */
function loadTs(relPath, seen = new Set()) {
  const abs = path.join(projectRoot, relPath);
  const rel = path.relative(projectRoot, abs);
  const outPath = path.join(buildDir, rel.replace(/\.tsx?$/, ".mjs"));
  const outUrl = pathToFileURL(outPath).href;

  if (seen.has(abs)) return outUrl;
  seen.add(abs);

  const source = readFileSync(abs, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: abs,
  });

  // Resolve local imports first so their output exists on disk.
  const importRe = /from\s+["'](\.{1,2}\/[^"']+)["']/g;
  let match;
  let rewritten = outputText;
  while ((match = importRe.exec(outputText)) !== null) {
    const spec = match[1];
    if (!/\.(ts|tsx)$/.test(spec)) {
      const candidateTs = path.resolve(path.dirname(abs), `${spec}.ts`);
      const candidateTsx = path.resolve(path.dirname(abs), `${spec}.tsx`);
      let target = null;
      try {
        readFileSync(candidateTs);
        target = candidateTs;
      } catch {
        try {
          readFileSync(candidateTsx);
          target = candidateTsx;
        } catch {
          continue; // non-local / package import
        }
      }
      const childRel = path.relative(projectRoot, target);
      loadTs(childRel, seen);
      rewritten = rewritten.replace(
        `from "${spec}"`,
        `from "${spec}.mjs"`
      ).replace(
        `from '${spec}'`,
        `from '${spec}.mjs'`
      );
    }
  }

  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, rewritten, "utf8");
  return outUrl;
}

const ssrf = await import(loadTs("src/lib/ssrf-guard.ts"));
const computerControl = await import(loadTs("src/lib/system/computer-control.ts"));
const requestAuth = await import(loadTs("src/lib/request-auth.ts"));

test("SSRF: blocks loopback, private, link-local and metadata addresses", () => {
  const blocked = [
    "http://127.0.0.1/",
    "http://127.1.2.3/",
    "http://10.0.0.1/",
    "http://172.16.5.4/",
    "http://192.168.0.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://100.64.0.1/",
    "http://0.0.0.0/",
    "http://[::1]/",
    "http://[fe80::1]/",
    "http://[fd00::1]/",
    "http://[::ffff:127.0.0.1]/",
  ];
  for (const url of blocked) {
    assert.throws(() => ssrf.checkUrlSyntax(url), ssrf.SsrfError, `expected block: ${url}`);
  }
});

test("SSRF: blocks non-http(s) schemes and credential-bearing URLs", () => {
  const blocked = ["file:///etc/passwd", "gopher://x/", "ftp://x/", "https://user:pass@example.com/"];
  for (const url of blocked) {
    assert.throws(() => ssrf.checkUrlSyntax(url), ssrf.SsrfError, `expected block: ${url}`);
  }
});

test("SSRF: blocks internal hostnames", () => {
  const blocked = ["http://localhost/", "http://metadata/", "http://db.internal/", "http://printer.local/"];
  for (const url of blocked) {
    assert.throws(() => ssrf.checkUrlSyntax(url), ssrf.SsrfError, `expected block: ${url}`);
  }
});

test("SSRF: allows ordinary public URLs", () => {
  const allowed = ["https://example.com/path?q=1", "http://93.184.216.34/", "https://api.github.com/repos/x/y"];
  for (const url of allowed) {
    assert.doesNotThrow(() => ssrf.checkUrlSyntax(url), `expected allow: ${url}`);
  }
});

test("SSRF: isBlockedIp classifies ranges", () => {
  assert.equal(ssrf.isBlockedIp("127.0.0.1"), true);
  assert.equal(ssrf.isBlockedIp("169.254.169.254"), true);
  assert.equal(ssrf.isBlockedIp("8.8.8.8"), false);
  assert.equal(ssrf.isBlockedIp("::1"), true);
  assert.equal(ssrf.isBlockedIp("2606:4700:4700::1111"), false);
});

test("Command injection: app names with shell metacharacters are rejected", () => {
  const payloads = [
    'notepad"; calc; "',
    "app; rm -rf /",
    "$(whoami)",
    "`whoami`",
    "app && calc",
    "app | whoami",
    "app' ; Start-Process calc; '",
    "app\ncalc.exe",
    "app %COMSPEC%",
    "app $env:PATH",
  ];
  for (const payload of payloads) {
    assert.equal(computerControl.isSafeAppName(payload), false, `expected reject: ${JSON.stringify(payload)}`);
  }
});

test("Command injection: legitimate app names are accepted", () => {
  for (const name of ["whatsapp", "Visual Studio Code", "calc", "Microsoft Word", "vs code"]) {
    assert.equal(computerControl.isSafeAppName(name), true, `expected accept: ${name}`);
  }
});

test("Command injection: unsafe app names are refused before any process spawn", async () => {
  const result = await computerControl.findSystemApp('x"; Start-Process calc; "');
  assert.equal(result.foundOnSystem, false);
  assert.equal(result.displayName, "Unsupported app name");
});

test("Ownership: a user cannot access another user's resource", () => {
  const alice = { userId: "alice", role: "user", plan: "Go", internal: false };
  const bob = { userId: "bob", role: "user", plan: "Go", internal: false };
  assert.equal(requestAuth.canAccessResource(alice, "alice"), true);
  assert.equal(requestAuth.canAccessResource(alice, "bob"), false);
  assert.equal(requestAuth.canAccessResource(bob, "alice"), false);
  assert.equal(requestAuth.canAccessResource(null, "alice"), false);
  assert.equal(requestAuth.canAccessResource(alice, undefined), false);
});

test("Ownership: admins may access any resource", () => {
  const admin = { userId: "admin", role: "admin", plan: "Pro", internal: false };
  assert.equal(requestAuth.canAccessResource(admin, "bob"), true);
});

test("Ownership: guest_ prefix is the same principal as the bare id", () => {
  const guest = { userId: "guest_abc123", role: "guest", plan: "Core", internal: false };
  assert.equal(requestAuth.canAccessResource(guest, "abc123"), true);
  assert.equal(requestAuth.canAccessResource(guest, "guest_abc123"), true);
  assert.equal(requestAuth.canAccessResource(guest, "abc124"), false);
});

test("Identity: isAdmin depends on the verified role", () => {
  assert.equal(requestAuth.isAdmin({ userId: "a", role: "user", plan: "Pro", internal: false }), false);
  assert.equal(requestAuth.isAdmin({ userId: "a", role: "admin", plan: "Pro", internal: false }), true);
  assert.equal(requestAuth.isAdmin(null), false);
});
