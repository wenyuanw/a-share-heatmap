import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";

import { ButtonLink } from "@/components/marketing/button-link";
import { JsonLd } from "@/components/marketing/json-ld";
import { LiveEmbedFrame } from "@/components/marketing/live-embed-frame";
import { PageHero } from "@/components/marketing/page-hero";
import { PageTransition } from "@/components/marketing/page-transition";
import { Reveal } from "@/components/marketing/reveal";
import { boardScopes, getBoardScope } from "@/data/boards";
import { siteConfig } from "@/lib/site";

type BoardScopePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return boardScopes.map((board) => ({ slug: board.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: BoardScopePageProps): Promise<Metadata> {
  const { slug } = await params;
  const board = getBoardScope(slug);
  if (!board) return {};

  const title = `${board.name}板块热力图 | ${board.name}板块实时行情与个股分布`;
  return {
    title,
    description: board.description,
    keywords: board.keywords,
    alternates: {
      canonical: `/sector/${board.slug}`,
    },
    openGraph: {
      title,
      description: board.description,
      url: `/sector/${board.slug}`,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      title,
      description: board.description,
      images: [siteConfig.ogImage],
    },
  };
}

export default async function BoardScopePage({ params }: BoardScopePageProps) {
  const { slug } = await params;
  const board = getBoardScope(slug);
  if (!board) notFound();

  const relatedBoards = boardScopes.filter((item) => item.slug !== board.slug).slice(0, 4);
  const embedSrc = `/?market=all&sector=${board.slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: siteConfig.name, item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: "行业板块热力图", item: `${siteConfig.url}/sector` },
        {
          "@type": "ListItem",
          position: 3,
          name: `${board.name}板块热力图`,
          item: `${siteConfig.url}/sector/${board.slug}`,
        },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <PageTransition transitionKey={board.slug}>
        <PageHero
          eyebrow={board.tagline}
          title={`${board.name}板块热力图`}
          description={board.description}
          size="lg"
        >
          <nav
            aria-label="面包屑"
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Link
              href="/sector"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1 transition-colors hover:border-border hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              行业板块热力图
            </Link>
            <span aria-hidden className="text-border">/</span>
            <span className="text-foreground">{board.name}</span>
          </nav>
        </PageHero>

        <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
          {/* Live embed */}
          <Reveal className="mt-2">
            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-x-4 -top-8 bottom-8 rounded-[2rem] bg-gradient-to-b from-brand/12 to-transparent blur-2xl sm:-inset-x-8"
              />
              <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_32px_80px_-32px_color-mix(in_srgb,black_55%,transparent)]">
                <LiveEmbedFrame
                  src={embedSrc}
                  title={`${board.name}板块热力图实时预览`}
                  className="h-[480px] sm:h-[560px] md:h-[640px]"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                上方为{board.name}板块的实时热力图，仅显示板块内个股，支持缩放、平移与悬浮查看。
              </p>
              <ButtonLink href={embedSrc} prefetch={false} variant="outline" target="_blank" rel="noopener noreferrer">
                在新窗口打开完整版
                <ExternalLink aria-hidden />
              </ButtonLink>
            </div>
          </Reveal>

          {/* Highlights */}
          <section aria-labelledby="highlights-heading" className="mt-16">
            <Reveal>
              <h2 id="highlights-heading" className="text-xl font-semibold tracking-tight">
                {board.name}板块看点
              </h2>
            </Reveal>
            <ul className="mt-6 grid gap-4 sm:grid-cols-3">
              {board.highlights.map((highlight, index) => (
                <Reveal key={highlight} delay={index * 70} className="h-full">
                  <li className="marketing-card h-full rounded-xl border border-border/70 bg-card/60 p-5 text-sm leading-relaxed text-muted-foreground">
                    <span className="mb-3 flex size-7 items-center justify-center rounded-lg border border-brand/25 bg-brand/10 font-mono text-xs font-semibold text-brand">
                      {index + 1}
                    </span>
                    {highlight}
                  </li>
                </Reveal>
              ))}
            </ul>
          </section>

          {/* Related boards */}
          <section aria-labelledby="related-heading" className="mt-16">
            <Reveal>
              <h2 id="related-heading" className="text-xl font-semibold tracking-tight">
                其他行业板块
              </h2>
            </Reveal>
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {relatedBoards.map((item, index) => (
                <Reveal key={item.slug} delay={index * 60} className="h-full">
                  <li className="h-full">
                    <Link
                      href={`/sector/${item.slug}`}
                      className="marketing-card group flex h-full items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/60 px-4 py-3.5"
                    >
                      <span className="text-sm font-medium">{item.name}板块热力图</span>
                      <ArrowRight
                        className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-brand"
                        aria-hidden
                      />
                    </Link>
                  </li>
                </Reveal>
              ))}
            </ul>
            <Reveal className="mt-4">
              <Link
                href="/sector"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                浏览全部行业板块
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Reveal>
          </section>
        </div>
      </PageTransition>
    </>
  );
}
