"use client";

import { X, ZoomIn } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import rewardCover from "../../../public/sponsor/reward-cover.jpg";

/**
 * WeChat reward QR with a click-to-zoom overlay, so visitors can scan
 * comfortably even on small cards.
 */
export function RewardQr() {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!zoomed) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [zoomed]);

  return (
    <>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label="放大微信赞赏码"
        className="group relative block shrink-0 overflow-hidden rounded-xl border border-border/60 shadow-[0_10px_28px_-14px_color-mix(in_srgb,var(--brand)_55%,transparent)] transition-transform duration-300 hover:scale-[1.04] focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Image
          src={rewardCover}
          alt="微信赞赏码，扫码请作者喝杯咖啡"
          width={rewardCover.width}
          height={rewardCover.height}
          className="block h-36 w-36 object-cover sm:h-40 sm:w-40"
        />
        <span className="absolute inset-0 hidden items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
          <ZoomIn className="size-6 text-white" aria-hidden />
        </span>
      </button>

      {zoomed ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="微信赞赏码"
          className="reward-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
        >
          <div
            className="reward-card relative flex max-w-sm flex-col items-center gap-4 rounded-2xl bg-card p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomed(false)}
              aria-label="关闭"
              className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4.5" aria-hidden />
            </button>
            <Image
              src={rewardCover}
              alt="微信赞赏码，扫码请作者喝杯咖啡"
              width={rewardCover.width}
              height={rewardCover.height}
              className="h-auto max-h-[62vh] w-auto rounded-lg"
            />
            <p className="text-center text-sm text-muted-foreground">
              用微信扫一扫，请作者喝杯咖啡，金额随意。
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
