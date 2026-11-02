import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { JsonLd } from "@/components/marketing/json-ld";
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

export default async function BlogPostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const MdxContent = await renderMdx(post.content);

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
    <>
      <JsonLd data={jsonLd} />
      <article className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <header className="marketing-fade-up">
          <Link
            href="/whats-new"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            返回博客
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
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

        <hr className="my-8 border-border" />

        <Reveal className="mdx-content text-[15px]">
          <MdxContent />
        </Reveal>

        <footer className="mt-14 border-t border-border/60 pt-6">
          <Link
            href="/"
            prefetch={false}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-brand"
          >
            打开热力图，试试文中提到的功能
          </Link>
        </footer>
      </article>
    </>
  );
}
