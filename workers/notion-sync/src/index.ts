// Notion -> GitHub PR sync for the glossary. Runs daily on a cron trigger.
// Notion is the editing surface; Git (via PR) is the source of truth.

interface Env {
  NOTION_TOKEN: string;
  NOTION_DATABASE_ID: string;
  GITHUB_TOKEN: string;
  GITHUB_REPO: string; // "owner/repo"
  GITHUB_BASE: string; // "main"
}

const CATEGORIES = ['space', 'sustainability', 'marketing', 'web-architecture'];
const TERMS_DIR = 'src/content/terms';
const BRANCH = 'notion-sync';
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Notion property names: keep in sync with the database
const P = { term: 'Term', slug: 'Slug', category: 'Category', aliases: 'Aliases',
  short: 'Short', related: 'Related', status: 'Status' };

type Json = any;

/* ---------- Notion ---------- */

const notion = async (env: Env, path: string, init?: RequestInit): Promise<Json> => {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Notion ${path}: ${res.status} ${await res.text()}`);
  return res.json();
};

async function queryPublished(env: Env): Promise<Json[]> {
  const pages: Json[] = [];
  let cursor: string | undefined;
  do {
    const data = await notion(env, `/databases/${env.NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      body: JSON.stringify({
        filter: { property: P.status, select: { equals: 'Published' } },
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return pages;
}

const text = (arr: Json[] = []) => arr.map((t) => t.plain_text).join('');

const richText = (arr: Json[] = []) =>
  arr.map((t) => {
    let s: string = t.plain_text;
    const a = t.annotations ?? {};
    if (a.code) s = `\`${s}\``;
    if (a.bold) s = `**${s}**`;
    if (a.italic) s = `_${s}_`;
    if (a.strikethrough) s = `~~${s}~~`;
    if (t.href) s = `[${s}](${t.href})`;
    return s;
  }).join('');

async function blocksToMarkdown(env: Env, blockId: string, depth = 0): Promise<string> {
  const lines: string[] = [];
  let cursor: string | undefined;
  do {
    const data = await notion(env, `/blocks/${blockId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`);
    for (const b of data.results) {
      const pad = '  '.repeat(depth);
      const t = b.type;
      const rt = richText(b[t]?.rich_text);
      let line: string | null = null;
      switch (t) {
        case 'paragraph': line = rt; break;
        case 'heading_1': line = `## ${rt}`; break;   // page title is the h1
        case 'heading_2': line = `### ${rt}`; break;
        case 'heading_3': line = `#### ${rt}`; break;
        case 'bulleted_list_item': line = `${pad}- ${rt}`; break;
        case 'numbered_list_item': line = `${pad}1. ${rt}`; break;
        case 'to_do': line = `${pad}- [${b.to_do.checked ? 'x' : ' '}] ${rt}`; break;
        case 'quote':
        case 'callout': line = `> ${rt}`; break;
        case 'divider': line = '---'; break;
        case 'code': line = '```' + (b.code.language ?? '') + '\n' + text(b.code.rich_text) + '\n```'; break;
        default: console.warn(`Unsupported block type: ${t}`);
      }
      if (line !== null) lines.push(line);
      if (b.has_children && depth < 3 && ['bulleted_list_item', 'numbered_list_item', 'to_do'].includes(t)) {
        lines.push(await blocksToMarkdown(env, b.id, depth + 1));
      }
      // blank line between block-level items, tight for list items
      if (line !== null && !['bulleted_list_item', 'numbered_list_item', 'to_do'].includes(t)) lines.push('');
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ---------- Build term files ---------- */

interface Built { slug: string; content: string }

async function buildFiles(env: Env, pages: Json[]) {
  const idToSlug = new Map<string, string>();
  for (const p of pages) {
    const slug = text(p.properties[P.slug]?.rich_text).trim();
    if (slug) idToSlug.set(p.id, slug);
  }
  const files: Built[] = [];
  const skipped: string[] = [];

  for (const p of pages) {
    const props = p.properties;
    const term = text(props[P.term]?.title).trim();
    const slug = text(props[P.slug]?.rich_text).trim();
    const category = props[P.category]?.select?.name;
    const short = text(props[P.short]?.rich_text).trim();
    const aliasProp = props[P.aliases];
    const aliases: string[] = aliasProp?.multi_select
      ? aliasProp.multi_select.map((o: Json) => o.name)
      : text(aliasProp?.rich_text).split(',').map((s) => s.trim()).filter(Boolean);
    const related: string[] = (props[P.related]?.relation ?? [])
      .map((r: Json) => idToSlug.get(r.id)).filter(Boolean) as string[];
    const missingRelations = (props[P.related]?.relation ?? []).length - related.length;

    const problems: string[] = [];
    if (!term) problems.push('missing Term');
    if (!SLUG_RE.test(slug)) problems.push(`bad Slug "${slug}"`);
    if (!CATEGORIES.includes(category)) problems.push(`bad Category "${category}"`);
    if (!short || short.length > 200) problems.push('Short missing or over 200 characters');
    if (missingRelations > 0) problems.push('Related points at an unpublished term');
    if (problems.length) { skipped.push(`${term || p.id}: ${problems.join('; ')}`); continue; }

    const body = await blocksToMarkdown(env, p.id);
    const updated = (p.last_edited_time as string).slice(0, 10);
    const fm = [
      '---',
      `term: ${JSON.stringify(term)}`,
      `category: ${category}`,
      `aliases: ${JSON.stringify(aliases)}`,
      `short: ${JSON.stringify(short)}`,
      `related: ${JSON.stringify(related)}`,
      `updated: ${updated}`,
      '---',
    ].join('\n');
    files.push({ slug, content: `${fm}\n${body}\n` });
  }
  return { files, skipped };
}

/* ---------- GitHub ---------- */

const gh = async (env: Env, path: string, init?: RequestInit, okStatuses: number[] = []): Promise<Json> => {
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'rjmlaird-glossary-sync',
      'Content-Type': 'application/json',
    },
  });
  if (okStatuses.includes(res.status)) return null;
  if (!res.ok) throw new Error(`GitHub ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
};

async function blobSha(content: string): Promise<string> {
  const body = new TextEncoder().encode(content);
  const head = new TextEncoder().encode(`blob ${body.length}\0`);
  const buf = new Uint8Array(head.length + body.length);
  buf.set(head); buf.set(body, head.length);
  const digest = await crypto.subtle.digest('SHA-1', buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const toBase64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

async function syncToGitHub(env: Env, files: Built[], skipped: string[]) {
  const base = env.GITHUB_BASE;
  const existingList: Json[] = (await gh(env, `/contents/${TERMS_DIR}?ref=${base}`, undefined, [404])) ?? [];
  const existing = new Map<string, string>(existingList.filter((f) => f.name.endsWith('.md')).map((f) => [f.name, f.sha]));

  const wanted = new Map(files.map((f) => [`${f.slug}.md`, f.content]));
  const added: string[] = [], updated: string[] = [], removed: string[] = [];
  const toWrite: { name: string; content: string; sha?: string }[] = [];

  for (const [name, content] of wanted) {
    const prev = existing.get(name);
    const sha = await blobSha(content);
    if (!prev) { added.push(name); toWrite.push({ name, content }); }
    else if (prev !== sha) { updated.push(name); toWrite.push({ name, content, sha: prev }); }
  }
  for (const name of existing.keys()) if (!wanted.has(name)) removed.push(name);

  if (!toWrite.length && !removed.length) {
    console.log('No changes.');
    return;
  }

  // Reset the sync branch to the current base, then apply changes
  const baseSha = (await gh(env, `/git/ref/heads/${base}`)).object.sha;
  const branchRef = await gh(env, `/git/ref/heads/${BRANCH}`, undefined, [404]);
  if (branchRef) {
    await gh(env, `/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: baseSha, force: true }) });
  } else {
    await gh(env, '/git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: baseSha }) });
  }

  for (const f of toWrite) {
    await gh(env, `/contents/${TERMS_DIR}/${f.name}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `glossary: ${f.sha ? 'update' : 'add'} ${f.name.replace('.md', '')} from Notion`,
        content: toBase64(f.content), branch: BRANCH, ...(f.sha ? { sha: f.sha } : {}),
      }),
    });
  }
  for (const name of removed) {
    await gh(env, `/contents/${TERMS_DIR}/${name}`, {
      method: 'DELETE',
      body: JSON.stringify({ message: `glossary: remove ${name.replace('.md', '')} (unpublished in Notion)`, sha: existing.get(name), branch: BRANCH }),
    });
  }

  const list = (h: string, a: string[]) => (a.length ? `**${h}**\n${a.map((x) => `- ${x}`).join('\n')}\n\n` : '');
  const prBody =
    `Automated daily sync from the Notion glossary database.\n\n` +
    list('Added', added) + list('Updated', updated) + list('Removed', removed) +
    list('Skipped (failed validation, fix in Notion)', skipped);

  const owner = env.GITHUB_REPO.split('/')[0];
  const open: Json[] = await gh(env, `/pulls?head=${owner}:${BRANCH}&state=open`);
  if (open.length) {
    await gh(env, `/pulls/${open[0].number}`, { method: 'PATCH', body: JSON.stringify({ body: prBody }) });
  } else {
    await gh(env, '/pulls', {
      method: 'POST',
      body: JSON.stringify({ title: 'Glossary: sync from Notion', head: BRANCH, base, body: prBody }),
    });
  }
  console.log(`PR ready: +${added.length} ~${updated.length} -${removed.length}, skipped ${skipped.length}`);
}

/* ---------- Entry ---------- */

export default {
  async scheduled(_c: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil((async () => {
      const pages = await queryPublished(env);
      const { files, skipped } = await buildFiles(env, pages);
      await syncToGitHub(env, files, skipped);
    })());
  },
};
