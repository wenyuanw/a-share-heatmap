import type { Metadata } from "next";
import type { ComponentProps } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";

import { ButtonLink } from "@/components/marketing/button-link";
import { JsonLd } from "@/components/marketing/json-ld";
import { PageTransition } from "@/components/marketing/page-transition";
import { Reveal } from "@/components/marketing/reveal";
import { getPostBySlug, getPosts, renderMdx } from "@/lib/blog";
import { siteConfig } from "@/lib/site";

type PostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};

  const url = `/whats-new/${post.slug}`;
  return {
    title: `${post.title} | ${siteConfig.name}`,
    description: post.summary,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary,
      url,
      publishedTime: post.date,
      authors: [siteConfig.author.name],
      tags: post.tags,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      title: post.title,
      description: post.summary,
      images: [siteConfig.ogImage],
    },
  };
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
}

/** MDX tables render through .table-wrap for the rounded, scrollable card look. */
function MdxTable({ children, ...props }: ComponentProps<"table">) {
  return (
    <div className="table-wrap">
      <table {...props}>{children}</table>
    </div>
  );
}

export default async function BlogPostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const MdxContent = await renderMdx(post.content);
  const readMinutes = Math.max(1, Math.round(post.content.length / 450));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    inLanguage: "zh-CN",
    author: {
      "@type": "Person",
      name: siteConfig.author.name,
      url: siteConfig.author.github,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteConfig.url}/whats-new/${post.slug}`,
    },
  };

  return (
    <PageTransition transitionKey={post.slug}>
      <JsonLd data={jsonLd} />
      <div className="relative overflow-hidden">
        <div aria-hidden className="marketing-grid-bg absolute inset-x-0 top-0 h-72" />
        <div aria-hidden className="marketing-glow absolute inset-x-0 top-0 h-72" />
        <article className="relative mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <header className="marketing-fade-up">
            <Link
              href="/whats-new"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              返回博客
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
              <time dateTime={post.date} className="tabular-nums">
                {formatDate(post.date)}
              </time>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden />
                约 {readMinutes} 分钟读完
              </span>
              {post.tags.length > 0 ? (
                <span className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </span>
              ) : null}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">{post.summary}</p>
          </header>

          <div
            aria-hidden
            className="my-10 h-px border-0 bg-gradient-to-r from-transparent via-border to-transparent"
          />

          <Reveal className="mdx-content text-[15px]">
            <MdxContent components={{ table: MdxTable }} />
          </Reveal>

          <footer className="mt-14">
            <Reveal>
              <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 px-6 py-8 text-center sm:px-12">
                <div aria-hidden className="marketing-glow absolute inset-0" />
                <div className="relative">
                  <h2 className="text-lg font-semibold tracking-tight">读完想试试？</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    打开热力图，文中提到的功能都在里面，大部分操作一试就会。
                  </p>
                  <div className="mt-5">
                    <ButtonLink href="/" prefetch={false}>
                      打开热力图
                    </ButtonLink>
                  </div>
                </div>
              </div>
            </Reveal>
          </footer>
        </article>
      </div>
    </PageTransition>
  );
}
