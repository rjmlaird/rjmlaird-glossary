import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ site }) => {
  const terms = (await getCollection('terms'))
    .sort((a, b) => a.data.term.localeCompare(b.data.term, 'en-GB'))
    .map((t) => ({
      term: t.data.term,
      slug: t.slug,
      short: t.data.short,
      url: new URL(`/${t.slug}/`, site).href,
    }));
  return new Response(JSON.stringify(terms), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
