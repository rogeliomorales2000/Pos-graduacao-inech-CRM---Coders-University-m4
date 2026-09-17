#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const GIT_COAUTHOR_NAME = process.env.GIT_COAUTHOR_NAME ?? "Joaldo Lima";
const GIT_COAUTHOR_EMAIL =
  process.env.GIT_COAUTHOR_EMAIL ?? "jasmon.rogelio@uni9.edu.br";

const FLAGS = {
  message: null,
  noPush: false,
};

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    ...opts,
  });
  if (res.error) {
    throw new Error(`falha ao executar '${cmd}' (${res.error.message})`);
  }
  return res;
}

function stdout(cmd, args) {
  return run(cmd, args).stdout.trim();
}

function rawOutput(cmd, args) {
  return run(cmd, args).stdout.replace(/\n+$/, "");
}

function isGitRepo() {
  const res = run("git", ["rev-parse", "--is-inside-work-tree"]);
  return res.status === 0 && res.stdout.trim() === "true";
}

function parseArgs(argv) {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--message" || arg === "-m") {
      FLAGS.message = argv[++i];
    } else if (arg === "--no-push") {
      FLAGS.noPush = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        "commit-and-push: analisa as mudanças pendentes, gera mensagem conventional-commits, faz git add, commit com co-author e push.\n\nUso: bun run commit-and-push [--message \"<header>\" | -m] [--no-push]",
      );
      process.exit(0);
    } else {
      throw new Error(`argumento desconhecido: ${arg}`);
    }
  }
}

function pathSegments(file) {
  return file.split("/").filter(Boolean);
}

function firstSegment(file) {
  const segs = pathSegments(file);
  return segs[0];
}

function classify(file) {
  if (/\.(spec|test)\.(tsx?|jsx?|mjs)$/.test(file) || file.startsWith("e2e/") || file.includes("/tests/")) {
    return "test";
  }
  if (/\.md$/.test(file) || file.startsWith(".docs/") || file.startsWith("adrs/") || file === "README.md") {
    return "docs";
  }
  if (file.startsWith(".specs/") || file.startsWith(".plans/")) {
    return "spec";
  }
  if (file.startsWith("supabase/migrations/") && file.endsWith(".sql")) {
    return "migration";
  }
  if (
    /(^|\/)(package\.json|bun\.lock|turbo\.json|\.gitignore|\.env\.example|\.npmrc|\.lefthook\.ya?ml|commitlint\.config\.(mjs|js|ts)|docker-compose\.ya?ml|playwright\.config\.ts|vitest\.config\.ts|eslint\.config\.(js|mjs)|tsconfig.*\.json|next\.config\.[jt]s|vite\.config\.[jt]s|supabase\/config\.toml)$/.test(file) ||
    file.startsWith("infra/")
  ) {
    return "config";
  }
  return "code";
}

function pickType(counts) {
  if (counts.code > 0 || counts.migration > 0) return "feat";
  if (counts.test > 0 && counts.docs === 0 && counts.config === 0) return "test";
  if (counts.docs > 0 && counts.config === 0 && counts.spec === 0) return "docs";
  if (counts.spec > 0 && counts.config === 0) return "docs";
  return "chore";
}

const SCOPE_ALIASES = {
  "apps/api": "api",
  "apps/app": "app",
  "apps/web": "web",
  "apps/docs": "docs",
  "packages/ui": "ui",
  "packages/eslint-config": "eslint-config",
  "packages/typescript-config": "tsconfig",
};

function pickScope(files) {
  const all = new Set();
  const preferred = new Set();
  for (const file of files) {
    const segs = pathSegments(file);
    if (segs.length < 2) continue;
    const key = segs.slice(0, 2).join("/");
    const alias = SCOPE_ALIASES[key];
    const scope = alias ?? firstSegment(file);
    if (scope.startsWith(".")) continue;
    all.add(scope);
    if (alias) preferred.add(scope);
  }
  return [...(preferred.size > 0 ? preferred : all)].slice(0, 2).join(", ");
}

function keywordSubject(files) {
  const joined = files.join("\n").toLowerCase();
  if (/\.lefthook|commitlint/.test(joined)) {
    return "configura lint de mensagens de commit";
  }
  if (/migration/.test(joined)) {
    return "adiciona migração de banco";
  }
  if (/docker-compose|(^|\/)infra\//.test(joined)) {
    return "adiciona infraestrutura local";
  }
  if (/(^|\/)adrs\//.test(joined)) {
    return "documenta decisões de arquitetura";
  }
  return null;
}

function fallbackSubject(type, scope) {
  const where = scope ? ` em ${scope}` : "";
  switch (type) {
    case "feat":
      return `implementa novos recursos${where}`;
    case "test":
      return `adiciona testes${where}`;
    case "docs":
      return `atualiza documentação${where}`;
    case "chore":
      return `atualiza configurações do projeto${where}`;
    default:
      return "atualiza o código-fonte";
  }
}

function pickSubject(type, scope, files) {
  const custom = keywordSubject(files);
  const subject = custom ?? fallbackSubject(type, scope);
  return subject.length > 100 ? subject.slice(0, 97).trimEnd() + "..." : subject;
}

function buildHeader(type, scope, subject) {
  const prefix = scope ? `${type}(${scope}): ` : `${type}: `;
  return prefix + subject;
}

function buildBody(entries) {
  const groups = { "??": "Novos", M: "Modificados", A: "Adicionados", D: "Removidos", R: "Renomeados", C: "Copiados" };
  const lines = [];
  for (const [status, path] of entries) {
    const label = groups[status[0] ?? ""] ?? groups[status[1] ?? ""] ?? "Alterados";
    lines.push(`- ${label}: ${path}`);
  }
  return [
    `Altera ${entries.length} arquivo(s):`,
    "",
    ...lines.flatMap((line) => wrapBodyLine(line, 100)),
    "",
    `Co-authored-by: ${GIT_COAUTHOR_NAME} <${GIT_COAUTHOR_EMAIL}>`,
  ].join("\n");
}

function wrapBodyLine(line, width) {
  const out = [];
  let rest = line;
  while (rest.length > width) {
    out.push(rest.slice(0, width));
    rest = `  ${rest.slice(width)}`;
  }
  out.push(rest);
  return out;
}

function parseStatus() {
  const raw = rawOutput("git", ["status", "--porcelain=v1", "-uall"]);
  if (!raw) return [];
  return raw.split("\n").filter(Boolean).map((line) => {
    const status = line.slice(0, 2);
    let path = line.slice(3);
    const renameMatch = path.match(/^(.+) -> (.+)$/);
    if (renameMatch) path = renameMatch[2];
    return [status, path];
  });
}

function validateMessage(message) {
  const file = join(tmpdir(), `commitlint-${process.pid}.txt`);
  writeFileSync(file, message);
  const res = run("bunx", ["commitlint", "--edit", file]);
  return { status: res.status, output: res.stdout + res.stderr };
}

function hasBranchUpstream() {
  return run("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]).status === 0;
}

function main() {
  parseArgs(process.argv.slice(2));

  if (!isGitRepo()) {
    console.error("erro: diretório atual não é um repositório git.");
    process.exit(1);
  }

  const entries = parseStatus();
  if (entries.length === 0) {
    console.log("nada para commitar — árvore de trabalho limpa.");
    process.exit(0);
  }

  const files = entries.map(([, path]) => path);
  const counts = { code: 0, test: 0, docs: 0, spec: 0, migration: 0, config: 0 };
  for (const file of files) counts[classify(file)] += 1;

  const type = pickType(counts);
  const scope = pickScope(files);
  const subject = pickSubject(type, scope, files);
  const header = FLAGS.message ?? buildHeader(type, scope, subject);
  const body = buildBody(entries);
  const message = `${header}\n\n${body}`;

  console.log("Mensagem de commit gerada:\n");
  console.log(message, "\n");

  let valid = validateMessage(message).status === 0;
  if (!valid && header.length > 72) {
    const short = header.slice(0, 72).replace(/: +$/, "").trimEnd() + "...";
    valid = validateMessage(`${short}\n\n${body}`).status === 0;
  }
  if (!valid) {
    console.error("erro: mensagem não passa no commitlint. Use --message para definir a mensagem manualmente.");
    const diag = validateMessage(message);
    if (diag.output) console.error(diag.output.trim());
    process.exit(1);
  }

  const add = run("git", ["add", "-A"]);
  if (add.status !== 0) {
    console.error("erro ao executar git add -A:", add.stderr.trim());
    process.exit(1);
  }
  console.log("git add -A: ok");

  const commit = run("git", ["commit", "-m", header, "-m", body]);
  console.log(commit.stdout.trim());
  if (commit.status !== 0) {
    console.error(commit.stderr.trim());
    process.exit(1);
  }

  if (FLAGS.noPush) {
    console.log("push ignorado (--no-push).");
    process.exit(0);
  }

  const remote = stdout("git", ["remote"]);
  if (!remote) {
    console.log("sem remote configurado — commit criado, push ignorado.");
    process.exit(0);
  }

  const branch = stdout("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  const args = hasBranchUpstream() ? ["push"] : ["push", "-u", "origin", branch];
  const push = run("git", args);
  console.log(push.stdout.trim());
  if (push.status !== 0) {
    console.error(push.stderr.trim());
    process.exit(1);
  }
  console.log(`push ok: ${branch} → origin`);
}

main();