import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHeader } from "@/components/marketing/header";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
