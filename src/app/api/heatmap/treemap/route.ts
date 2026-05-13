import { NextRequest, NextResponse } from "next/server";

import { getTreemapData, isHeatmapPeriodKey, isMarketKey } from "@/lib/market-heatmap";

export async function GET(request: NextRequest) {
  const marketParam = request.nextUrl.searchParams.get("market") ?? "all";
  const periodParam = request.nextUrl.searchParams.get("period") ?? "day";

  if (!isMarketKey(marketParam)) {
    return NextResponse.json(
      {
        success: false,
        message: `Invalid market: ${marketParam}`,
      },
      { status: 400 }
    );
  }

  if (!isHeatmapPeriodKey(periodParam)) {
    return NextResponse.json(
      {
        success: false,
        message: `Invalid period: ${periodParam}`,
      },
      { status: 400 }
    );
  }

  try {
    const data = await getTreemapData(marketParam, periodParam);
    const response = NextResponse.json(data);
    response.headers.set("Cache-Control", "public, s-maxage=6, stale-while-revalidate=10");

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to load treemap data",
      },
      { status: 502 }
    );
  }
}
