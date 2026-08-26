/**
 * Typed WordPress REST API client — `${NEXT_PUBLIC_WP_URL}/wp-json/wp/v2/`.
 *
 * ⚠️ Architecture note (see CLAUDE.md): this site is a custom "gogo" theme whose page
 * DESIGN is rendered server-side from post-meta that the REST API does NOT expose
 * (`content.rendered` is empty for the inner pages). So the rendered pages are built
 * from `content/site.json` — a snapshot of the LIVE HTML (see lib/content.ts).
 *
 * This module is the typed REST layer used to DISCOVER structure (pages, posts, media,
 * menus) and to (re)generate that snapshot via `scripts/scrape.mjs`. Pagination is
 * handled correctly by reading the `X-WP-TotalPages` response header so nothing is missed.
 */

export const WP_URL = (
  process.env.NEXT_PUBLIC_WP_URL ?? "https://3locksmiths.co.il"
).replace(/\/+$/, "");
export const WP_API = `${WP_URL}/wp-json/wp/v2`;

export interface WP_Rendered {
  rendered: string;
  protected?: boolean;
}

export interface WP_Page {
  id: number;
  date: string;
  modified: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: WP_Rendered;
  content: WP_Rendered;
  excerpt: WP_Rendered;
  author: number;
  featured_media: number;
  parent: number;
  menu_order: number;
  template: string;
}

export interface WP_Post extends Omit<WP_Page, "parent" | "menu_order" | "template"> {
  categories: number[];
  tags: number[];
  sticky: boolean;
  format: string;
}

export interface WP_MediaSize {
  source_url: string;
  width: number;
  height: number;
  mime_type: string;
}

export interface WP_Media {
  id: number;
  slug: string;
  type: string;
  link: string;
  title: WP_Rendered;
  media_type: string;
  mime_type: string;
  source_url: string;
  alt_text: string;
  media_details: {
    width: number;
    height: number;
    sizes?: Record<string, WP_MediaSize>;
  };
}

export interface WP_MenuItem {
  id: number;
  title: string;
  url: string;
  parent: number;
  order: number;
}

/** Fetch every item of a collection, following `X-WP-TotalPages` so no content is missed. */
export async function fetchAllPaginated<T>(path: string, perPage = 100): Promise<T[]> {
  const out: T[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${WP_API}/${path}${sep}per_page=${perPage}&page=${page}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok)
      throw new Error(`WP REST "${path}" failed: ${res.status} ${res.statusText}`);
    totalPages = parseInt(res.headers.get("x-wp-totalpages") ?? "1", 10) || 1;
    out.push(...((await res.json()) as T[]));
    page += 1;
  } while (page <= totalPages);
  return out;
}

export function getPages(): Promise<WP_Page[]> {
  return fetchAllPaginated<WP_Page>("pages?status=publish&orderby=menu_order&order=asc");
}

export function getPosts(): Promise<WP_Post[]> {
  return fetchAllPaginated<WP_Post>("posts?status=publish");
}

export function getMedia(): Promise<WP_Media[]> {
  return fetchAllPaginated<WP_Media>("media");
}

export async function getPage(id: number): Promise<WP_Page> {
  const res = await fetch(`${WP_API}/pages/${id}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`WP page ${id} failed: ${res.status}`);
  return (await res.json()) as WP_Page;
}

/**
 * WordPress core exposes no menu route; this site's navigation is captured in the HTML
 * snapshot. If a menu REST plugin (e.g. "WP-REST-API V2 Menus") is later enabled, this
 * reads `/wp-json/menus/v1/menus/<slug>`. Returns `[]` when unavailable.
 */
export async function getMenu(slug: string): Promise<WP_MenuItem[]> {
  try {
    const res = await fetch(`${WP_URL}/wp-json/menus/v1/menus/${slug}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      items?: {
        ID: number;
        title: string;
        url: string;
        menu_item_parent: string;
        menu_order: number;
      }[];
    };
    return (data.items ?? []).map((i) => ({
      id: i.ID,
      title: i.title,
      url: i.url,
      parent: Number(i.menu_item_parent) || 0,
      order: i.menu_order,
    }));
  } catch {
    return [];
  }
}
