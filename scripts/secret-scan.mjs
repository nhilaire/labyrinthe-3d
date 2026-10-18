#!/usr/bin/env node
// Secret and personal-data scanner. Zero dependencies, copied verbatim into every app repository
// as scripts/secret-scan.mjs (git hooks use it there; the factory's Claude hook uses this copy).
//
// Usage: node secret-scan.mjs [--staged | --worktree | --history] [--dir <repo>] [--no-identity]
// Exit code: 0 clean, 1 findings, 2 scanner error. Findings never print the matched value in clear.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const ALLOW_MARKER = 'secret-scan:allow';

export const FORBIDDEN_PATHS = [
  { re: /(^|\/)google-services\.json$/i, why: 'Firebase config file: keep it local (firebase/README.md)' },
  { re: /(^|\/)GoogleService-Info\.plist$/i, why: 'Firebase iOS config file' },
  { re: /\.(jks|keystore|p12|pfx|pem|key)$/i, why: 'signing key or certificate', except: /(^|\/)debug\.keystore$/i },
  { re: /(^|\/)\.env(\.[^/]+)?$/i, why: 'environment file', except: /\.env\.example$/i },
  { re: /(^|\/)(keystore|key|signing|local)\.properties$/i, why: 'local or signing properties' },
  { re: /\.(apk|aab)$/i, why: 'build artifact' },
  { re: /service[-_]?account[^/]*\.json$/i, why: 'service account credentials' },
  { re: /(^|\/)factory\.local\.json$/i, why: 'machine-local factory config' },
  { re: /pii-denylist/i, why: 'personal denylist' },
];

// Patterns are assembled from pieces so that this file never matches itself.
const BEGIN = '-----' + 'BEGIN';
export const SECRET_PATTERNS = [
  { id: 'private-key', re: new RegExp(BEGIN + ' (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY') },
  { id: 'google-api-key', re: /AIza[0-9A-Za-z_-]{35}/ },
  { id: 'github-token', re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/ },
  { id: 'github-pat', re: /github_pat_[A-Za-z0-9_]{50,}/ },
  { id: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: 'slack-token', re: /xox[abprs]-[A-Za-z0-9-]{10,}/ },
  { id: 'stripe-live-key', re: /\b[sr]k_live_[0-9A-Za-z]{20,}/ },
  { id: 'llm-api-key', re: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{32,}/ },
  { id: 'service-account', re: /"type"\s*:\s*"service_account"/ },
  { id: 'private-key-field', re: /"private_key"\s*:\s*"/ },
  { id: 'jwt', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { id: 'signing-password', re: /FACTORY_(?:STORE|KEY)_PASSWORD\s*[=:]\s*\S+/ },
  {
    id: 'hardcoded-credential',
    re: /\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|store_?password|key_?password)\b["']?\s*[:=]\s*["'][^"'\s]{6,}["']/i,
  },
];

const FILE_EXTENSIONS_AS_TLD = /^(png|jpe?g|gif|webp|svg|ttf|otf|woff2?|js|jsx|ts|tsx|json|mp3|wav|ogg|m4a|mp4|lottie)$/i;
const ALLOWED_EMAIL_DOMAINS = /(^|\.)(example\.(com|org|net)|users\.noreply\.github\.com|noreply\.github\.com)$/i;

export const PII_PATTERNS = [
  {
    id: 'email-address',
    re: /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+([A-Za-z]{2,})/g,
    keep: (m) => {
      const domain = m[0].split('@')[1];
      const tld = m[2];
      if (FILE_EXTENSIONS_AS_TLD.test(tld)) return false;
      if (ALLOWED_EMAIL_DOMAINS.test(domain)) return false;
      if (/^(no-?reply|noreply)$/i.test(m[0].split('@')[0])) return false;
      return true;
    },
  },
  {
    id: 'windows-user-path',
    re: /\b[A-Za-z]:(?:\\{1,2}|\/)Users(?:\\{1,2}|\/)([^\\/\s"'<>`*]+)/gi,
    keep: (m) => !/^(public|default|default user|all users|runneradmin|\.\.\.)$/i.test(m[1]),
  },
  {
    id: 'unix-home-path',
    re: /(?:^|[\s"'(=:])\/(?:Users|home)\/([A-Za-z0-9._-]+)/g,
    keep: (m) => !/^(runner|user|username|me|shared|node)$/i.test(m[1]),
  },
  { id: 'french-mobile-number', re: /(?<![\d.])(?:\+33\s?|0)[67](?:[\s.-]?\d{2}){4}(?![\d])/g, keep: () => true },
];

const SKIP_CONTENT = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb)$/i;

export function mask(value) {
  const s = String(value);
  if (s.length <= 6) return '***';
  return `${s.slice(0, 4)}***(${s.length} chars)`;
}

export function loadDenylist(file = defaultDenylistFile()) {
  try {
    return fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && l.length >= 3);
  } catch {
    return [];
  }
}

export function defaultDenylistFile() {
  return process.env.FACTORY_PII_DENYLIST || path.join(os.homedir(), '.android-game-factory', 'pii-denylist.txt');
}

export function checkPath(relPath) {
  const p = relPath.replace(/\\/g, '/');
  for (const rule of FORBIDDEN_PATHS) {
    if (rule.re.test(p) && !(rule.except && rule.except.test(p))) {
      return { file: p, line: 0, rule: 'forbidden-file', detail: rule.why };
    }
  }
  return null;
}

export function scanText(relPath, text, denylist = []) {
  const file = relPath.replace(/\\/g, '/');
  if (SKIP_CONTENT.test(file)) return [];
  const findings = [];
  const lowerTerms = denylist.map((t) => t.toLowerCase());
  const lines = String(text).split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes(ALLOW_MARKER)) return;
    const lineNo = i + 1;
    for (const p of SECRET_PATTERNS) {
      const m = line.match(p.re);
      if (m) findings.push({ file, line: lineNo, rule: p.id, detail: mask(m[0]) });
    }
    for (const p of PII_PATTERNS) {
      for (const m of line.matchAll(p.re)) {
        if (p.keep(m)) findings.push({ file, line: lineNo, rule: p.id, detail: mask(m[0].trim()) });
      }
    }
    const lower = line.toLowerCase();
    lowerTerms.forEach((term, idx) => {
      if (lower.includes(term)) findings.push({ file, line: lineNo, rule: 'denylisted-personal-term', detail: `term #${idx + 1} ${mask(denylist[idx])}` });
    });
  });
  return findings;
}

export function checkIdentityEmail(email, where) {
  const e = String(email || '').trim();
  if (!e) return { file: where, line: 0, rule: 'git-identity', detail: 'no git user.email configured (use your GitHub noreply address)' };
  if (!/@users\.noreply\.github\.com$/i.test(e)) {
    return { file: where, line: 0, rule: 'git-identity', detail: `${mask(e)} is not a GitHub noreply address` };
  }
  return null;
}

function git(dir, args, { buffer = false } = {}) {
  return execFileSync('git', ['-C', dir, ...args], {
    encoding: buffer ? 'buffer' : 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function isBinary(buf) {
  return buf.subarray(0, 8000).includes(0);
}

function scanBlob(file, buf, denylist, findings) {
  if (!buf || buf.length > 2 * 1024 * 1024 || isBinary(buf)) return;
  findings.push(...scanText(file, buf.toString('utf8'), denylist));
}

export function scanRepo(dir, mode = 'worktree', { identity = true, denylist = loadDenylist() } = {}) {
  const findings = [];
  const notes = [];
  if (mode === 'staged') {
    const files = git(dir, ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']).split('\0').filter(Boolean);
    for (const f of files) {
      const forbidden = checkPath(f);
      if (forbidden) findings.push(forbidden);
      scanBlob(f, git(dir, ['show', `:${f}`], { buffer: true }), denylist, findings);
    }
  } else if (mode === 'worktree') {
    const files = git(dir, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean);
    for (const f of files) {
      const forbidden = checkPath(f);
      if (forbidden) findings.push(forbidden);
      const abs = path.join(dir, f);
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) scanBlob(f, fs.readFileSync(abs), denylist, findings);
    }
  } else if (mode === 'history') {
    const hasCommits = spawnSync('git', ['-C', dir, 'rev-parse', '--verify', 'HEAD'], { stdio: 'ignore' }).status === 0;
    if (hasCommits) {
      const names = new Set(git(dir, ['log', '--all', '--name-only', '--format=', '--diff-filter=ACMR']).split(/\r?\n/).filter(Boolean));
      for (const f of names) {
        const forbidden = checkPath(f);
        if (forbidden) findings.push({ ...forbidden, detail: `${forbidden.detail} (present in history)` });
      }
      // Added lines of every commit, attributed to their file.
      const patch = git(dir, ['log', '--all', '-p', '--no-color', '--no-ext-diff', '--format=%x00commit']);
      let current = null;
      const added = new Map();
      for (const line of patch.split(/\r?\n/)) {
        if (line.startsWith('+++ ')) {
          current = line.startsWith('+++ b/') ? line.slice(6) : null;
        } else if (current && line.startsWith('+') && !line.startsWith('+++')) {
          if (!added.has(current)) added.set(current, []);
          added.get(current).push(line.slice(1));
        }
      }
      for (const [f, lines] of added) {
        for (const finding of scanText(f, lines.join('\n'), denylist)) findings.push({ ...finding, line: 0, detail: `${finding.detail} (in history)` });
      }
      const authors = new Set(git(dir, ['log', '--all', '--format=%ae%n%ce']).split(/\r?\n/).filter(Boolean));
      for (const email of authors) {
        const bad = checkIdentityEmail(email, 'commit metadata');
        if (bad) findings.push(bad);
      }
    } else {
      notes.push('no commits yet: history scan skipped');
    }
  } else {
    throw new Error(`unknown mode ${mode}`);
  }

  if (identity) {
    let email = '';
    try {
      email = git(dir, ['config', 'user.email']).trim();
    } catch {
      /* not configured */
    }
    const bad = checkIdentityEmail(email, 'git config user.email');
    if (bad) findings.push(bad);
  }

  // gitleaks is a second opinion when installed; the built-in rules always run.
  const gitleaksArgs = mode === 'staged' ? ['git', '--pre-commit', '--staged'] : mode === 'history' ? ['git'] : null;
  if (gitleaksArgs) {
    const res = spawnSync('gitleaks', [...gitleaksArgs, '--redact', '--no-banner', '--exit-code', '1', dir], { encoding: 'utf8' });
    if (res.error) notes.push('gitleaks not installed: built-in rules only');
    else if (res.status === 1) findings.push({ file: '(gitleaks)', line: 0, rule: 'gitleaks', detail: 'gitleaks reported leaks: run `gitleaks git -v --redact` in the repo' });
    else if (res.status !== 0) notes.push(`gitleaks exited ${res.status}: ignored`);
  }

  const unique = new Map(findings.map((f) => [`${f.file}:${f.line}:${f.rule}:${f.detail}`, f]));
  return { findings: [...unique.values()], notes };
}

export function formatReport({ findings, notes }, mode) {
  const out = [];
  if (findings.length === 0) out.push(`secret-scan (${mode}): clean`);
  else {
    out.push(`secret-scan (${mode}): ${findings.length} finding(s) - nothing may be committed or pushed until fixed`);
    for (const f of findings.slice(0, 50)) out.push(`  - ${f.file}${f.line ? ':' + f.line : ''} [${f.rule}] ${f.detail}`);
    if (findings.length > 50) out.push(`  ... ${findings.length - 50} more`);
    out.push(`False positive? Add "${ALLOW_MARKER}" in a comment on that line, with a reason.`);
  }
  for (const n of notes) out.push(`  note: ${n}`);
  return out.join('\n');
}

function main(argv) {
  const mode = argv.includes('--staged') ? 'staged' : argv.includes('--history') ? 'history' : 'worktree';
  const dirIdx = argv.indexOf('--dir');
  const dir = path.resolve(dirIdx >= 0 ? argv[dirIdx + 1] : process.cwd());
  try {
    const result = scanRepo(dir, mode, { identity: !argv.includes('--no-identity') });
    console.log(formatReport(result, mode));
    return result.findings.length ? 1 : 0;
  } catch (err) {
    console.error(`secret-scan: error: ${err.message}`);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(main(process.argv.slice(2)));
}
