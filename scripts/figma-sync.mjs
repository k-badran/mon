#!/usr/bin/env node
/**
 * Keeps the site honest about which Figma version it implements.
 *
 * The M.io file (key in design/figma-sync.json) is edited continuously, and the
 * code is only ever "in sync" with one of its saved versions. That version is
 * recorded in design/figma-sync.json; this script diffs it against the file as
 * it is now and lists every top-level frame that was added, removed, moved or
 * edited — down to the texts and colours that changed — so a sync starts from a
 * list of frames rather than from eyeballing forty artboards.
 *
 *   pnpm figma:check            what changed since the synced version
 *   pnpm figma:check --json     the same, machine-readable
 *   pnpm figma:mark-synced      record the current Figma version as implemented
 *
 * The token is read from FIGMA_TOKEN in the environment or the root .env (a
 * personal access token; they expire, so a 403 means make a new one). Nothing
 * but Node's own fetch is used. Downloaded file versions are cached in
 * .figma-cache/ because the API rate-limits whole-file reads hard.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE = join(ROOT, "design", "figma-sync.json");
const CACHE = join(ROOT, ".figma-cache");

function token() {
  if (process.env.FIGMA_TOKEN) return process.env.FIGMA_TOKEN.trim();
  const envFile = join(ROOT, ".env");
  if (existsSync(envFile)) {
    const line = readFileSync(envFile, "utf8")
      .replace(/^﻿/, "")
      .split(/\r?\n/)
      .find((l) => l.startsWith("FIGMA_TOKEN="));
    if (line) return line.slice("FIGMA_TOKEN=".length).trim();
  }
  throw new Error("FIGMA_TOKEN is not set (environment or root .env).");
}

/** GET with the token, retrying on 429 with the delay Figma asks for. */
async function figma(path) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await fetch(`https://api.figma.com/v1${path}`, {
      headers: { "X-Figma-Token": token() },
    });
    if (response.status === 429) {
      const wait = Number(response.headers.get("retry-after")) || 15 * (attempt + 1);
      // Seats without a Dev or Full licence get a handful of file reads per
      // month, and Figma answers with a Retry-After measured in days. Waiting
      // that out in a terminal helps nobody; say when it lifts instead.
      if (wait > 120) {
        const until = new Date(Date.now() + wait * 1000).toISOString().slice(0, 16).replace("T", " ");
        throw new Error(
          `Figma rate limit on ${path.split("?")[0]}: blocked for ${Math.round(wait / 3600)}h (until ~${until} UTC). ` +
            `This token's seat has a low API quota; a Dev or Full seat lifts it.`,
        );
      }
      console.error(`rate-limited by Figma, retrying in ${wait}s…`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!response.ok) throw new Error(`Figma ${path}: HTTP ${response.status} ${await response.text()}`);
    return response.json();
  }
  throw new Error(`Figma ${path}: still rate-limited after retries`);
}

async function fileAt(key, version) {
  const cached = join(CACHE, `${key}-${version}.json`);
  if (existsSync(cached)) return JSON.parse(readFileSync(cached, "utf8"));
  const file = await figma(`/files/${key}?version=${version}`);
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(cached, JSON.stringify(file));
  return file;
}

const walk = (node, visit) => {
  visit(node);
  (node.children ?? []).forEach((child) => walk(child, visit));
};

const texts = (node) => {
  const out = [];
  walk(node, (n) => n.type === "TEXT" && out.push(n.characters));
  return out;
};

const hex = ({ r, g, b }) =>
  "#" + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");

const colours = (node) => {
  const out = new Set();
  walk(node, (n) =>
    [...(n.fills ?? []), ...(n.strokes ?? [])].forEach((p) => p.color && out.add(hex(p.color))),
  );
  return out;
};

/** A frame's content with ids and absolute positions removed, so a move is not an edit. */
const signature = (node) =>
  JSON.stringify(node, (k, v) =>
    ["id", "absoluteBoundingBox", "absoluteRenderBounds", "transitionNodeID"].includes(k)
      ? undefined
      : v,
  );

const topFrames = (file) =>
  file.document.children.flatMap((page) =>
    page.children.map((frame) => ({ page: page.name, frame })),
  );

function diff(before, after) {
  const old = topFrames(before);
  const byId = new Map(old.map((x) => [x.frame.id, x]));
  const byName = new Map(old.map((x) => [`${x.frame.type}:${x.frame.name}`, x]));
  const matched = new Set();
  const report = [];

  for (const { page, frame } of topFrames(after)) {
    // A frame moved between pages keeps its name but gets a new id.
    const prev = byId.get(frame.id) ?? byName.get(`${frame.type}:${frame.name}`);
    const entry = { page, id: frame.id, name: frame.name, type: frame.type };
    if (!prev || matched.has(prev.frame.id)) {
      report.push({ ...entry, status: "new" });
      continue;
    }
    matched.add(prev.frame.id);
    const moved = prev.frame.id !== frame.id || prev.page !== page;
    if (signature(prev.frame) === signature(frame)) {
      if (moved) report.push({ ...entry, status: "moved", from: `${prev.page} ${prev.frame.id}` });
      continue;
    }
    const a = texts(prev.frame);
    const b = texts(frame);
    const ca = colours(prev.frame);
    const cb = colours(frame);
    report.push({
      ...entry,
      status: "changed",
      ...(moved ? { from: `${prev.page} ${prev.frame.id}` } : {}),
      textsAdded: b.filter((t) => !a.includes(t)),
      textsRemoved: a.filter((t) => !b.includes(t)),
      coloursAdded: [...cb].filter((c) => !ca.has(c)),
      coloursRemoved: [...ca].filter((c) => !cb.has(c)),
    });
  }
  for (const { page, frame } of old) {
    if (!matched.has(frame.id)) report.push({ page, id: frame.id, name: frame.name, status: "removed" });
  }
  return report;
}

const link = (key, id) => `https://www.figma.com/design/${key}/?node-id=${id.replace(":", "-")}`;

async function main() {
  const [command = "check", ...flags] = process.argv.slice(2);
  const state = JSON.parse(readFileSync(STATE, "utf8"));
  const { versions } = await figma(`/files/${state.fileKey}/versions?page_size=50`);
  const latest = versions[0];

  if (command === "mark-synced") {
    const version = flags.find((f) => !f.startsWith("--")) ?? latest.id;
    const meta = versions.find((v) => v.id === version);
    writeFileSync(
      STATE,
      JSON.stringify(
        { ...state, syncedVersion: version, syncedVersionCreatedAt: meta?.created_at ?? null },
        null,
        2,
      ) + "\n",
    );
    console.log(`design/figma-sync.json now records version ${version} (${meta?.created_at ?? "?"}).`);
    return;
  }

  if (latest.id === state.syncedVersion) {
    console.log(`Up to date: the code implements Figma version ${latest.id} (${latest.created_at}).`);
    return;
  }

  const newer = versions.filter((v) => v.created_at > (state.syncedVersionCreatedAt ?? ""));
  console.log(
    `Figma has ${newer.length} version(s) newer than the synced ${state.syncedVersion}; latest ${latest.id} (${latest.created_at}, ${latest.user.handle}).`,
  );

  const [before, after] = [
    await fileAt(state.fileKey, state.syncedVersion),
    await figma(`/files/${state.fileKey}`),
  ];
  const report = diff(before, after);

  if (flags.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (report.length === 0) console.log("Versions differ, but no frame content changed.");
  for (const r of report) {
    console.log(`\n${r.status.toUpperCase().padEnd(8)} ${r.page} / ${r.name}  ${link(state.fileKey, r.id)}`);
    if (r.from) console.log(`         was ${r.from}`);
    for (const t of r.textsAdded ?? []) console.log(`         + "${t.slice(0, 100)}"`);
    for (const t of r.textsRemoved ?? []) console.log(`         - "${t.slice(0, 100)}"`);
    if (r.coloursAdded?.length) console.log(`         colours + ${r.coloursAdded.join(" ")}`);
    if (r.coloursRemoved?.length) console.log(`         colours - ${r.coloursRemoved.join(" ")}`);
  }
  console.log("\nAfter implementing these, run `pnpm figma:mark-synced`.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
