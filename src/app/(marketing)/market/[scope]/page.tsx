import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";

import { ButtonLink } from "@/components/marketing/button-link";
import { JsonLd } from "@/components/marketing/json-ld";
import { PageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/marketing/reveal";
import { getMarketScope, marketScopes } from "@/data/markets";
import { siteConfig } from "@/lib/site";

type MarketScopePageProps = {
  params: Promise<{ scope: string }>;
};

export function generateStaticParams() {
  return marketScopes.map((scope) => ({ scope: scope.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: MarketScopePageProps): Promise<Metadata> {
  const { scope } = await params;
  const info = getMarketScope(scope);
  if (!info) return {};

  const title = `${info.name}热力图 | ${info.name}大盘云图实时行情`;
  return {
    title,
    description: info.description,
    keywords: info.keywords,
    alternates: {
      canonical: `/market/${info.slug}`,
    },
    openGraph: {
      title,
      description: info.description,
      url: `/market/${info.slug}`,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      title,
      description: info.description,
      images: [siteConfig.ogImage],
    },
  };
}

export default async function MarketScopePage({ params }: MarketScopePageProps) {
  const { scope } = await params;
  const info = getMarketScope(scope);
  if (!info) notFound();

  const relatedScopes = marketScopes.filter((item) => item.slug !== info.slug).slice(0, 4);
  const embedSrc = `/?market=${info.slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: siteConfig.name, item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: "市场热力图", item: `${siteConfig.url}/market` },
        {
          "@type": "ListItem",
          position: 3,
          name: `${info.name}热力图`,
          item: `${siteConfig.url}/market/${info.slug}`,
        },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <nav aria-label="面包屑" className="marketing-fade-up mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/market" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden />
            市场热力图
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">{info.name}</span>
        </nav>

        <PageHeader
          eyebrow={info.tagline}
          title={`${info.name}热力图`}
          description={info.description}
        />

        {/* Live embed */}
        <Reveal className="mt-10">
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-x-8 -top-8 bottom-8 rounded-[2rem] bg-gradient-to-b from-brand/12 to-transparent blur-2xl"
            />
            <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_32px_80px_-32px_color-mix(in_srgb,black_55%,transparent)]">
              <iframe
                src={embedSrc}
                title={`${info.name}热力图实时预览`}
                loading="lazy"
                className="block h-[480px] w-full sm:h-[560px] md:h-[640px]"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              上方为可交互的实时热力图，支持缩放、平移与悬浮查看个股。
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
              {info.name}热力图看点
            </h2>
          </Reveal>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {info.highlights.map((highlight, index) => (
              <Reveal key={highlight} delay={index * 70} className="h-full">
                <li className="marketing-card h-full rounded-xl border border-border/70 bg-card/60 p-5 text-sm leading-relaxed text-muted-foreground">
                  <span className="mb-3 flex size-7 items-center justify-center rounded-lg border border-border/60 bg-muted/50 font-mono text-xs text-foreground">
                    {index + 1}
                  </span>
                  {highlight}
                </li>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* Related scopes */}
        <section aria-labelledby="related-heading" className="mt-16">
          <Reveal>
            <h2 id="related-heading" className="text-xl font-semibold tracking-tight">
              其他市场范围
            </h2>
          </Reveal>
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {relatedScopes.map((item, index) => (
              <Reveal key={item.slug} delay={index * 60} className="h-full">
                <li className="h-full">
                  <Link
                    href={`/market/${item.slug}`}
                    className="marketing-card group flex h-full items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/60 px-4 py-3.5"
                  >
                    <span className="text-sm font-medium">{item.name}热力图</span>
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
              href="/market"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              浏览全部市场范围
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Reveal>
        </section>
      </div>
    </>
  );
}
