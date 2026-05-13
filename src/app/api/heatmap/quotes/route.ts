import { NextRequest, NextResponse } from "next/server";

import {
  getQuoteData,
  isHeatmapPeriodKey,
  isMarketKey,
  isMetricKey,
  periodFromMetricKey,
} from "@/lib/market-heatmap";

export async function GET(request: NextRequest) {
  const marketParam = request.nextUrl.searchParams.get("market") ?? "all";
  const metricParam = request.nextUrl.searchParams.get("metric") ?? "1";
  const periodParam = request.nextUrl.searchParams.get("period");

  if (!isMarketKey(marketParam)) {
    return NextResponse.json(
      {
        success: false,
        message: `Invalid market: ${marketParam}`,
      },
      { status: 400 }
    );
  }

  if (!isMetricKey(metricParam)) {
    return NextResponse.json(
      {
        success: false,
        message: `Invalid metric: ${metricParam}`,
      },
      { status: 400 }
    );
  }

  if (periodParam && !isHeatmapPeriodKey(periodParam)) {
    return NextResponse.json(
      {
        success: false,
        message: `Invalid period: ${periodParam}`,
      },
      { status: 400 }
    );
  }

  try {
    const period = periodParam && isHeatmapPeriodKey(periodParam) ? periodParam : periodFromMetricKey(metricParam);
    const response = NextResponse.json(await getQuoteData(marketParam, period, metricParam));
    response.headers.set("Cache-Control", "public, s-maxage=8, stale-while-revalidate=30");

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to load quote data",
      },
      { status: 502 }
    );
  }
}
