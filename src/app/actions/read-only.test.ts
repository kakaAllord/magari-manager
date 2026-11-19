import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

// While the dev views the app as someone, nothing may be written. That rests on every server action
// that changes data calling requireWriter first, so this test fails when a new one forgets.
// Allowed without it: signing in and out, the per-device language cookie, and the dev's own actions.
const EXEMPT = new Set(["auth.ts", "lang.ts", "dev.ts"]);
const dir = import.meta.dirname;

test("every server action that changes data starts with requireWriter", () => {
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !EXEMPT.has(f));
  assert.ok(files.length > 5);
  for (const file of files) {
    const source = readFileSync(path.join(dir, file), "utf8");
    // Helpers in the same file that call requireWriter themselves (e.g. managers.ts's staffRoles) count.
    const guards = ["requireWriter"];
    for (const m of source.matchAll(/^async function (\w+)\([^]*?^}/gm)) if (m[0].includes("await requireWriter(")) guards.push(m[1]);
    const guarded = new RegExp(`await (${guards.join("|")})\\(`);
    for (const body of source.split(/^export async function /m).slice(1)) {
      const name = body.slice(0, body.indexOf("("));
      assert.match(body.slice(0, body.search(/^}/m)), guarded, `${file}: ${name} must call requireWriter`);
    }
  }
});
