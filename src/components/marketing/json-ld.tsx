type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

/** Injects one or more JSON-LD structured data blocks. */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
