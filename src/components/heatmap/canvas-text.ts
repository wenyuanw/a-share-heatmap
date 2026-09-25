import { clamp } from "@/lib/utils";
import type { HeatmapMessages } from "@/lib/i18n";

import {
  formatBoardTrendCounts,
  formatChange,
  formatCompactChange,
  formatPrice,
} from "./format";
import type { CanvasTextLine, QuoteMap, StockRect, SubBoardRect } from "./types";

export const heatmapFontStack = `"Avenir Next Condensed", "DIN Condensed", "PingFang SC", "Microsoft YaHei", Arial, sans-serif`;

export function heatmapFont(weight: number, size: number) {
  return `${weight} ${size}px ${heatmapFontStack}`;
}

export function drawClippedText(
  context: CanvasRenderingContext2D,
  text: string,
  textX: number,
  textY: number,
  clipX: number,
  clipY: number,
  clipWidth: number,
  clipHeight: number
) {
  context.save();
  context.beginPath();
  context.rect(clipX, clipY, clipWidth, clipHeight);
  context.clip();
  context.fillText(text, textX, textY);
  context.restore();
}

export function fitTextToWidth(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (maxWidth <= 0 || text.length === 0) {
    return "";
  }

  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  let low = 1;
  let high = text.length;
  let best = "";

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = text.slice(0, mid);

    if (context.measureText(candidate).width <= maxWidth) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (best) {
    return best;
  }

  const firstCharacter = text.slice(0, 1);
  return context.measureText(firstCharacter).width <= maxWidth ? firstCharacter : "";
}

export function fitFontSizeToWidth(
  context: CanvasRenderingContext2D,
  text: string,
  weight: number,
  preferredSize: number,
  minSize: number,
  maxWidth: number
) {
  if (maxWidth <= 0 || text.length === 0) {
    return preferredSize;
  }

  context.font = heatmapFont(weight, preferredSize);
  const preferredWidth = context.measureText(text).width;

  if (preferredWidth <= maxWidth) {
    return preferredSize;
  }

  return clamp((preferredSize * maxWidth) / preferredWidth, minSize, preferredSize);
}

export function measureCanvasTextLine(
  context: CanvasRenderingContext2D,
  line: CanvasTextLine,
  fallbackFontSize: number
) {
  context.font = line.font;
  const metrics = context.measureText(line.text);
  const measuredAscent = metrics.actualBoundingBoxAscent;
  const measuredDescent = metrics.actualBoundingBoxDescent;

  return {
    ascent:
      Number.isFinite(measuredAscent) && measuredAscent > 0
        ? measuredAscent
        : fallbackFontSize * 0.8,
    descent:
      Number.isFinite(measuredDescent) && measuredDescent >= 0
        ? measuredDescent
        : fallbackFontSize * 0.2,
  };
}

export function drawCenteredTextStack(
  context: CanvasRenderingContext2D,
  lines: Array<CanvasTextLine & { fallbackFontSize: number }>,
  centerX: number,
  centerY: number,
  lineGap: number,
  clipRect: { x: number; y: number; width: number; height: number }
) {
  const measuredLines = lines.map((line) => ({
    ...line,
    ...measureCanvasTextLine(context, line, line.fallbackFontSize),
  }));
  const totalHeight =
    measuredLines.reduce((height, line) => height + line.ascent + line.descent, 0) +
    lineGap * Math.max(0, measuredLines.length - 1);
  let lineTop = centerY - totalHeight / 2;

  context.textAlign = "center";
  context.textBaseline = "alphabetic";

  for (const line of measuredLines) {
    context.font = line.font;
    drawClippedText(
      context,
      line.text,
      centerX,
      lineTop + line.ascent,
      clipRect.x,
      clipRect.y,
      clipRect.width,
      clipRect.height
    );
    lineTop += line.ascent + line.descent + lineGap;
  }
}

export function drawSectorHeaderLabel(
  context: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; titleHeight: number },
  options: {
    name: string;
    changePct: number | null;
    advanceCount: number;
    declineCount: number;
    messages: HeatmapMessages;
    showDrillHint?: boolean;
    compact?: boolean;
    showStats?: boolean;
  }
) {
  const { name, changePct, advanceCount, declineCount, messages } = options;
  const compact = Boolean(options.compact);
  const showDrillHint = Boolean(options.showDrillHint);
  const showStats = Boolean(options.showStats);

  if (rect.width <= 44 || rect.titleHeight <= 8) {
    return;
  }

  const fontSize = compact
    ? clamp(Math.floor(rect.titleHeight * 0.56), 9, 12)
    : clamp(Math.floor(rect.titleHeight * 0.52), 10, 15);
  const statsFontSize = compact
    ? clamp(Math.floor(rect.titleHeight * 0.48), 8, 11)
    : clamp(Math.floor(rect.titleHeight * 0.46), 9, 13);
  const leftPad = compact ? 5 : 8;
  const rightPad = showDrillHint ? 18 : compact ? 5 : 8;
  const available = Math.max(0, rect.width - leftPad - rightPad);
  const centerY = rect.y + rect.titleHeight / 2 + fontSize * (compact ? 0.06 : 0.08);
  const clipX = rect.x + (compact ? 3 : 4);
  const clipY = rect.y + (compact ? 1 : 2);
  const clipWidth = Math.max(0, rect.width - (compact ? 6 : 8));
  const clipHeight = Math.max(0, rect.titleHeight - (compact ? 2 : 4));
  const trendText = formatBoardTrendCounts(messages, advanceCount, declineCount);
  const changeText = compact && rect.width < 132 ? formatCompactChange(changePct) : formatChange(changePct);

  context.textBaseline = "middle";
  context.font = heatmapFont(650, statsFontSize);
  const trendWidth = context.measureText(trendText).width;
  const changeWidth = context.measureText(changeText).width;
  const statsGap = compact ? 5 : 7;
  const canShowTrend =
    showStats && available > (compact ? 108 : 148) && trendWidth + changeWidth + statsGap < available * 0.64;
  const canShowChange = showStats && available > (compact ? 72 : 96);
  const statsWidth = canShowChange ? changeWidth + (canShowTrend ? trendWidth + statsGap : 0) : 0;
  const nameMaxWidth = Math.max(0, available - (statsWidth > 0 ? statsWidth + (compact ? 6 : 8) : 0));

  context.fillStyle = "rgba(247, 250, 252, 0.96)";
  context.textAlign = "left";
  context.font = heatmapFont(700, fontSize);
  const fittedName = fitTextToWidth(context, name, nameMaxWidth);
  if (fittedName) {
    drawClippedText(context, fittedName, rect.x + leftPad, centerY, clipX, clipY, clipWidth, clipHeight);
  }

  if (!canShowChange) {
    return;
  }

  context.font = heatmapFont(650, statsFontSize);
  context.textAlign = "right";
  const statsRight = rect.x + rect.width - rightPad;
  drawClippedText(context, changeText, statsRight, centerY, clipX, clipY, clipWidth, clipHeight);

  if (canShowTrend) {
    context.fillStyle = "rgba(247, 250, 252, 0.86)";
    drawClippedText(
      context,
      trendText,
      statsRight - changeWidth - statsGap,
      centerY,
      clipX,
      clipY,
      clipWidth,
      clipHeight
    );
  }
}

export function drawSectorThumbnailLabel(
  context: CanvasRenderingContext2D,
  rect: SubBoardRect,
  messages: HeatmapMessages,
  zoomScale = 1
) {
  const displayWidth = rect.width * zoomScale;
  const displayHeight = rect.height * zoomScale;
  const screenUnit = 1 / zoomScale;
  const clipPaddingPx = displayWidth > 110 ? 6 : displayWidth > 54 ? 4 : 3;
  const textInsetXPx = displayWidth > 110 ? 8 : displayWidth > 54 ? 5 : 4;
  const textInsetYPx = displayHeight > 64 ? 7 : displayHeight > 36 ? 5 : 3;
  const clipPadding = clipPaddingPx * screenUnit;
  const textInsetX = textInsetXPx * screenUnit;
  const textInsetY = textInsetYPx * screenUnit;
  const clipWidth = Math.max(0, rect.width - clipPadding * 2);
  const clipHeight = Math.max(0, rect.height - clipPadding * 2);

  if (displayWidth < 18 || displayHeight < 12 || clipWidth <= 2 || clipHeight <= 2) {
    return;
  }

  const trendText = formatBoardTrendCounts(messages, rect.advanceCount, rect.declineCount);
  const changeText = displayWidth >= 72 ? formatChange(rect.changePct) : formatCompactChange(rect.changePct);
  const hasLargeLabel = displayWidth >= 96 && displayHeight >= 64;
  const hasStackedLabel = displayWidth >= 44 && displayHeight >= 36;

  context.save();
  try {
    context.fillStyle = "rgba(247, 250, 252, 0.96)";
    context.shadowColor = "rgba(0, 0, 0, 0.42)";
    context.shadowBlur = (displayHeight < 20 ? 0.5 : 1.3) * screenUnit;
    context.shadowOffsetY = 0.6 * screenUnit;

    if (hasLargeLabel) {
      const preferredTitleSize =
        clamp(Math.floor(Math.min(displayWidth, displayHeight) * 0.2), 13, 26) * screenUnit;
      const titleSize = fitFontSizeToWidth(
        context,
        rect.name,
        700,
        preferredTitleSize,
        Math.max(11 * screenUnit, preferredTitleSize * 0.66),
        clipWidth
      );
      const detailSize = Math.min(
        clamp(Math.floor(Math.min(displayWidth, displayHeight) * 0.16), 11, 22) * screenUnit,
        titleSize * 1.05
      );
      const trendSize = Math.max(10 * screenUnit, detailSize * 0.78);
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;

      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = heatmapFont(700, titleSize);
      drawClippedText(
        context,
        fitTextToWidth(context, rect.name, clipWidth),
        centerX,
        centerY - detailSize * 0.95,
        rect.x + clipPadding,
        rect.y + clipPadding,
        clipWidth,
        clipHeight
      );

      context.font = heatmapFont(700, detailSize);
      drawClippedText(
        context,
        changeText,
        centerX,
        centerY + detailSize * 0.18,
        rect.x + clipPadding,
        rect.y + clipPadding,
        clipWidth,
        clipHeight
      );

      if (displayHeight >= 78) {
        context.fillStyle = "rgba(247, 250, 252, 0.88)";
        context.font = heatmapFont(600, trendSize);
        drawClippedText(
          context,
          trendText,
          centerX,
          centerY + detailSize * 1.18,
          rect.x + clipPadding,
          rect.y + clipPadding,
          clipWidth,
          clipHeight
        );
      }
      return;
    }

    if (hasStackedLabel) {
      const preferredTitleSize =
        clamp(Math.floor(Math.min(displayWidth * 0.2, displayHeight * 0.28)), 8, 16) * screenUnit;
      const titleSize = fitFontSizeToWidth(
        context,
        rect.name,
        700,
        preferredTitleSize,
        Math.max(7 * screenUnit, preferredTitleSize * 0.72),
        clipWidth - (textInsetX - clipPadding)
      );
      const detailSize = Math.min(
        clamp(Math.floor(displayHeight * 0.22), 8, 14) * screenUnit,
        titleSize * 1.08
      );
      const trendSize = Math.max(7 * screenUnit, detailSize * 0.86);

      context.textAlign = "left";
      context.textBaseline = "alphabetic";
      context.font = heatmapFont(700, titleSize);
      drawClippedText(
        context,
        fitTextToWidth(context, rect.name, clipWidth - (textInsetX - clipPadding)),
        rect.x + textInsetX,
        rect.y + textInsetY + titleSize,
        rect.x + clipPadding,
        rect.y + clipPadding,
        clipWidth,
        clipHeight
      );

      context.font = heatmapFont(700, detailSize);
      drawClippedText(
        context,
        changeText,
        rect.x + textInsetX,
        rect.y + textInsetY + titleSize + detailSize + 1.5 * screenUnit,
        rect.x + clipPadding,
        rect.y + clipPadding,
        clipWidth,
        clipHeight
      );

      if (displayHeight >= 52 && displayWidth >= 64) {
        context.fillStyle = "rgba(247, 250, 252, 0.88)";
        context.font = heatmapFont(600, trendSize);
        drawClippedText(
          context,
          trendText,
          rect.x + textInsetX,
          rect.y + textInsetY + titleSize + detailSize + trendSize + 4.5 * screenUnit,
          rect.x + clipPadding,
          rect.y + clipPadding,
          clipWidth,
          clipHeight
        );
      }
      return;
    }

    const fontSize = clamp(Math.floor(Math.min(displayWidth * 0.2, displayHeight * 0.58)), 7, 12) * screenUnit;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.font = heatmapFont(700, fontSize);
    const canShowChange = displayWidth >= 40 && displayHeight >= 16;
    const fittedName = fitTextToWidth(
      context,
      canShowChange ? rect.name : changeText,
      clipWidth - (textInsetX - clipPadding)
    );
    if (fittedName) {
      drawClippedText(
        context,
        fittedName,
        rect.x + textInsetX,
        rect.y + rect.height / 2 + fontSize * 0.06,
        rect.x + clipPadding,
        rect.y + clipPadding,
        clipWidth,
        clipHeight
      );
    }
  } finally {
    context.restore();
  }
}

export function drawStockLabel(
  context: CanvasRenderingContext2D,
  stock: StockRect,
  zoomScale = 1,
  highlighted = false,
  quote?: QuoteMap[string]
) {
  const price = quote?.price ?? stock.price;
  const changePct = quote?.changePct ?? stock.changePct;
  const displayWidth = stock.width * zoomScale;
  const displayHeight = stock.height * zoomScale;
  const screenUnit = 1 / zoomScale;
  const clipPaddingPx = displayWidth > 110 ? 5 : displayWidth > 54 ? 3 : 2;
  const textInsetXPx = displayWidth > 110 ? 6 : displayWidth > 54 ? 4 : 3;
  const textInsetYPx = displayHeight > 56 ? 4.5 : displayHeight > 26 ? 3 : 2;
  const clipPadding = clipPaddingPx * screenUnit;
  const textInsetX = textInsetXPx * screenUnit;
  const textInsetY = textInsetYPx * screenUnit;
  const clipWidth = Math.max(0, stock.width - clipPadding * 2);
  const clipHeight = Math.max(0, stock.height - clipPadding * 2);

  if (displayWidth < 16 || displayHeight < 8 || clipWidth <= 2 || clipHeight <= 2) {
    return;
  }

  const hasLargeLabel = displayWidth >= 108 && displayHeight >= 58;
  const hasStackedLabel = displayWidth >= 28 && displayHeight >= 20;
  const hasInlineLabel = displayWidth >= 24 && displayHeight >= 10;
  const titleWeight = highlighted ? 800 : 700;
  const detailWeight = highlighted ? 750 : 650;

  context.save();
  try {
    context.fillStyle = "rgba(247, 250, 252, 0.96)";
    context.shadowColor = "rgba(0, 0, 0, 0.42)";
    context.shadowBlur = (displayHeight < 14 ? 0.45 : 1.2) * screenUnit;
    context.shadowOffsetY = 0.6 * screenUnit;

    if (hasLargeLabel) {
      const preferredTitleSize =
        clamp(Math.floor(Math.min(displayWidth, displayHeight) * 0.26), 15, 30) * screenUnit;
      const titleSize = fitFontSizeToWidth(
        context,
        stock.name,
        titleWeight,
        preferredTitleSize,
        Math.max(12 * screenUnit, preferredTitleSize * 0.66),
        clipWidth
      );
      const detailSize = Math.min(
        clamp(Math.floor(Math.min(displayWidth, displayHeight) * 0.19), 11, 23) * screenUnit,
        titleSize * 1.08
      );
      const centerX = stock.x + stock.width / 2;
      const centerY = stock.y + stock.height / 2;
      const titleFont = heatmapFont(titleWeight, titleSize);
      context.font = titleFont;
      const lines: Array<CanvasTextLine & { fallbackFontSize: number }> = [
        {
          text: fitTextToWidth(context, stock.name, clipWidth),
          font: titleFont,
          fallbackFontSize: titleSize,
        },
        {
          text: formatChange(changePct),
          font: heatmapFont(detailWeight, detailSize),
          fallbackFontSize: detailSize,
        },
      ];

      if (displayWidth > 180 && displayHeight > 100) {
        const priceSize = Math.max(11 * screenUnit, detailSize - 1 * screenUnit);
        lines.push({
          text: formatPrice(price),
          font: heatmapFont(550, priceSize),
          fallbackFontSize: priceSize,
        });
      }

      drawCenteredTextStack(
        context,
        lines,
        centerX,
        centerY,
        Math.max(3 * screenUnit, Math.min(titleSize, detailSize) * 0.12),
        {
          x: stock.x + clipPadding,
          y: stock.y + clipPadding,
          width: clipWidth,
          height: clipHeight,
        }
      );
      return;
    }

    if (hasStackedLabel) {
      const preferredTitleSize =
        clamp(Math.floor(Math.min(displayWidth * 0.19, displayHeight * 0.43)), 7.5, 16) * screenUnit;
      const titleSize = fitFontSizeToWidth(
        context,
        stock.name,
        titleWeight,
        preferredTitleSize,
        Math.max(6.5 * screenUnit, preferredTitleSize * 0.72),
        clipWidth - (textInsetX - clipPadding)
      );
      const detailSize = Math.min(
        clamp(Math.floor(displayHeight * 0.33), 7, 13) * screenUnit,
        titleSize * 1.08
      );

      context.textAlign = "left";
      context.textBaseline = "alphabetic";
      context.font = heatmapFont(titleWeight, titleSize);
      drawClippedText(
        context,
        fitTextToWidth(context, stock.name, clipWidth - (textInsetX - clipPadding)),
        stock.x + textInsetX,
        stock.y + textInsetY + titleSize,
        stock.x + clipPadding,
        stock.y + clipPadding,
        clipWidth,
        clipHeight
      );

      if (displayHeight >= 20) {
        context.font = heatmapFont(detailWeight, detailSize);
        drawClippedText(
          context,
          displayWidth >= 58 ? formatChange(changePct) : formatCompactChange(changePct),
          stock.x + textInsetX,
          stock.y + textInsetY + titleSize + detailSize + 1.5 * screenUnit,
          stock.x + clipPadding,
          stock.y + clipPadding,
          clipWidth,
          clipHeight
        );
      }
      return;
    }

    if (hasInlineLabel) {
      const fontSize =
        clamp(Math.floor(Math.min(displayWidth * 0.18, displayHeight * 0.68)), 6.5, 11) * screenUnit;
      const changeText = formatCompactChange(changePct);
      const gap = 3 * screenUnit;

      context.textAlign = "left";
      context.textBaseline = "middle";
      context.font = heatmapFont(detailWeight, fontSize);

      const changeWidth = context.measureText(changeText).width;
      const canShowChange = displayWidth >= 32 && changeWidth + gap < clipWidth * 0.72;
      const nameMaxWidth = canShowChange ? Math.max(0, clipWidth - changeWidth - gap) : clipWidth;
      const fittedName = fitTextToWidth(context, stock.name, nameMaxWidth);
      const labelY = stock.y + stock.height / 2 + fontSize * 0.06;

      if (fittedName) {
        drawClippedText(
          context,
          fittedName,
          stock.x + textInsetX,
          labelY,
          stock.x + clipPadding,
          stock.y + clipPadding,
          clipWidth,
          clipHeight
        );
      }

      if (canShowChange) {
        context.textAlign = "right";
        drawClippedText(
          context,
          changeText,
          stock.x + stock.width - textInsetX,
          labelY,
          stock.x + clipPadding,
          stock.y + clipPadding,
          clipWidth,
          clipHeight
        );
      }
      return;
    }

    if (displayWidth >= 18 && displayHeight >= 8) {
      const fontSize = clamp(Math.floor(displayHeight * 0.72), 6, 9) * screenUnit;

      context.textAlign = "left";
      context.textBaseline = "middle";
      context.font = heatmapFont(detailWeight, fontSize);
      const fittedName = fitTextToWidth(context, stock.name, clipWidth);

      if (fittedName) {
        drawClippedText(
          context,
          fittedName,
          stock.x + textInsetX,
          stock.y + stock.height / 2 + fontSize * 0.06,
          stock.x + clipPadding,
          stock.y + clipPadding,
          clipWidth,
          clipHeight
        );
      }
    }
  } finally {
    context.restore();
  }
}
