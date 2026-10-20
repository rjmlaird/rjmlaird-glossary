# rjmlaird glossary

Static Astro site, one Markdown file per term in `src/content/terms/`.

- Astro 5, static output. `npm install && npm run dev`
- `npm run build` runs `astro check` (types and content schema), builds, then indexes with Pagefind
- Cloudflare: build command `npm run build`, output directory `dist`, domain `glossary.rjmlaird.co.uk`. GitHub Actions (`ci.yml`) only runs the build as a check; it does not deploy
- Term files are named by slug (`link-budget.md` -> `/link-budget/`), lower-case, hyphenated. Fields: `term`, `category` (one of `space`, `sustainability`, `marketing`, `web-architecture`), `aliases`, `short` (max 200 chars), `related` (slugs), `updated`. No wikilinks; link to other terms with `[text](/slug/)`
- Category metadata is in `src/lib/categories.ts` (shared by the schema and pages)
- `snippets/Term.astro` is for copying into other sites; `snippets/subdomains-entry.json` goes in `subdomains.json`
- `src/styles/global.css` is a verbatim copy of the rjmlaird.co.uk brand stylesheet (re-copy when it changes); `src/styles/glossary.css` adds glossary layout using only those tokens

## Notion sync (workers/notion-sync)

Daily cron Worker: Notion database -> Markdown files -> PR on the `notion-sync` branch.

1. Create the Notion database with properties: Term (title), Slug (text), Category (select), Aliases (multi-select), Short (text), Related (relation to itself), Status (select: Draft/Published). Share it with your integration.
2. Set `NOTION_DATABASE_ID` and `GITHUB_REPO` in `wrangler.toml`.
3. `wrangler secret put NOTION_TOKEN` and `wrangler secret put GITHUB_TOKEN` (fine-grained: contents + pull requests on this repo).
4. `cd workers/notion-sync && npm i && npx wrangler deploy`. Test locally with `npm run dev` then `curl "http://localhost:8787/__scheduled"`.
