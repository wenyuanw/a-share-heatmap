import { evaluate } from "@mdx-js/mdx";
import matter from "gray-matter";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import remarkGfm from "remark-gfm";
import { z } from "zod";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export type BlogPostMeta = {
  /** URL slug, derived from the file name without the .mdx extension. */
  slug: string;
  title: string;
  /** Date in YYYY-MM-DD. */
  date: string;
  summary: string;
  tags: string[];
};

export type BlogPost = BlogPostMeta & {
  /** Raw MDX body without frontmatter. */
  content: string;
};

// gray-matter parses unquoted YAML dates into Date objects; normalize both forms.
const dateStringSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
);

const frontmatterSchema = z.object({
  title: z.string().min(1),
  date: dateStringSchema,
  summary: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

/**
 * All posts, newest first. Cached per request; during static rendering this
 * runs once at build time.
 */
export const getPosts = cache(async (): Promise<BlogPostMeta[]> => {
  let fileNames: string[];
  try {
    fileNames = await readdir(BLOG_DIR);
  } catch {
    return [];
  }

  const posts = await Promise.all(
    fileNames
      .filter((name) => name.endsWith(".mdx"))
      .map(async (name) => {
        const { meta } = await readPost(name.replace(/\.mdx$/, ""));
        return meta;
      }),
  );

  return posts.sort((a, b) => b.date.localeCompare(a.date) || b.slug.localeCompare(a.slug));
});

export const getPostBySlug = cache(async (slug: string): Promise<BlogPost | null> => {
  // Reject path tricks before touching the filesystem.
  if (!/^[\w-]+$/.test(slug)) return null;
  try {
    const { meta, content } = await readPost(slug);
    return { ...meta, content };
  } catch {
    return null;
  }
});

/** Compiles an MDX body into a React component (runs at build time). */
export async function renderMdx(source: string) {
  const { default: MdxContent } = await evaluate(source, {
    ...(await import("react/jsx-runtime")),
    remarkPlugins: [remarkGfm],
  });
  return MdxContent;
}

async function readPost(slug: string): Promise<{ meta: BlogPostMeta; content: string }> {
  const raw = await readFile(path.join(BLOG_DIR, `${slug}.mdx`), "utf8");
  const { data, content } = matter(raw);
  const meta = frontmatterSchema.parse(data);
  return { meta: { slug, ...meta }, content };
}
