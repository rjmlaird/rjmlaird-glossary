# rjmlaird glossary

Static Astro site, one Markdown file per term in `src/content/terms/`.

- `npm install && npm run dev`
- `npm run build` runs type/schema checks, builds, then indexes with Pagefind
- Cloudflare: build command `npm run build`, output directory `dist`, domain `glossary.rjmlaird.co.uk`
- `snippets/Term.astro` is for copying into other sites; `snippets/subdomains-entry.json` goes in `subdomains.json`
- `src/styles/global.css` is a verbatim copy of the rjmlaird.co.uk brand stylesheet (re-copy when it changes); `src/styles/glossary.css` adds glossary layout using only those tokens

## Notion sync (workers/notion-sync)

Daily cron Worker: Notion database -> Markdown files -> PR on the `notion-sync` branch.

1. Create the Notion database with properties: Term (title), Slug (text), Category (select), Aliases (multi-select), Short (text), Related (relation to itself), Status (select: Draft/Published). Share it with your integration.
2. Set `NOTION_DATABASE_ID` and `GITHUB_REPO` in `wrangler.toml`.
3. `wrangler secret put NOTION_TOKEN` and `wrangler secret put GITHUB_TOKEN` (fine-grained: contents + pull requests on this repo).
4. `cd workers/notion-sync && npm i && npx wrangler deploy`. Test locally with `npm run dev` then `curl "http://localhost:8787/__scheduled"`.
