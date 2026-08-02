import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteFrame from "@/components/SiteFrame";
import { getContentPages, getPageBySegments, buildMetadata } from "@/lib/content";

// Catch-all route mirroring every WordPress permalink (e.g. /מנעולן-רכב/, /מחירון/, /services/מולטילוק/).
// Only the snapshotted pages are generated; any other path 404s (strict 1:1 URL structure).
export const dynamicParams = false;

export function generateStaticParams(): { slug: string[] }[] {
  return getContentPages().map((p) => ({ slug: p.segments }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getPageBySegments(slug);
  return page ? buildMetadata(page.seo) : {};
}

export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const page = getPageBySegments(slug);
  if (!page) notFound();
  return <SiteFrame page={page} />;
}
