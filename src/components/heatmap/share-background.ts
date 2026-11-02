/** Frame a captured snapshot without rescaling its text or market data. */
export function addShareBackground(
  source: HTMLCanvasElement,
  pixelRatio: number,
  branding: { title: string; subtitle: string; logo?: CanvasImageSource }
) {
  const shorterSide = Math.min(source.width, source.height);
  const padding = Math.round(Math.max(12 * pixelRatio, Math.min(28 * pixelRatio, shorterSide * 0.03)));
  const unit = Math.max(0.8, Math.min(1.2, source.width / pixelRatio / 1000)) * pixelRatio;
  const headerHeight = Math.round(38 * unit);
  const footerHeight = Math.round(30 * unit);
  const canvas = document.createElement("canvas");
  canvas.width = source.width + padding * 2;
  canvas.height = source.height + headerHeight + footerHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Share background context unavailable");
  }

  const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, "#303237");
  background.addColorStop(0.5, "#20252b");
  background.addColorStop(1, "#161b20");
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Muted brand-red light and a soft silver lift keep the frame close to the
  // site's charcoal palette without competing with the heatmap's red/green.
  const warmGlow = context.createRadialGradient(
    canvas.width * 0.85, 0, 0,
    canvas.width * 0.85, 0, Math.max(canvas.width, canvas.height) * 0.8
  );
  warmGlow.addColorStop(0, "rgba(239, 68, 68, 0.16)");
  warmGlow.addColorStop(1, "rgba(239, 68, 68, 0)");
  context.fillStyle = warmGlow;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const silverGlow = context.createRadialGradient(
    0, canvas.height, 0,
    0, canvas.height, Math.max(canvas.width, canvas.height) * 0.75
  );
  silverGlow.addColorStop(0, "rgba(203, 213, 225, 0.16)");
  silverGlow.addColorStop(1, "rgba(203, 213, 225, 0)");
  context.fillStyle = silverGlow;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.5)";
  context.shadowBlur = padding * 0.6;
  context.shadowOffsetY = padding * 0.22;
  context.fillStyle = "#151922";
  context.fillRect(padding, headerHeight, source.width, source.height);
  context.restore();

  context.drawImage(source, padding, headerHeight);

  // Inset the stroke so the entire square border stays inside the image bounds.
  const borderWidth = pixelRatio * 0.75;
  context.strokeStyle = "rgba(255, 255, 255, 0.14)";
  context.lineWidth = borderWidth;
  context.strokeRect(
    padding + borderWidth / 2,
    headerHeight + borderWidth / 2,
    source.width - borderWidth,
    source.height - borderWidth
  );

  const titleY = headerHeight / 2;
  const logoSize = 18 * unit;
  const logoGap = branding.logo ? 7 * unit : 0;
  const availableTitleWidth = source.width - (branding.logo ? logoSize + logoGap : 0);
  const fontFamily = 'Arial, "PingFang SC", "Microsoft YaHei", sans-serif';

  context.textBaseline = "middle";
  context.font = `500 ${12 * unit}px ${fontFamily}`;
  const measuredTitleWidth = context.measureText(branding.title).width;
  const titleScale = Math.min(1, availableTitleWidth / Math.max(1, measuredTitleWidth));
  context.font = `500 ${12 * unit * titleScale}px ${fontFamily}`;
  const brandLeft = padding;
  if (branding.logo) {
    context.drawImage(branding.logo, brandLeft, titleY - logoSize / 2, logoSize, logoSize);
  }
  context.textAlign = "left";
  context.fillStyle = "#c8cdd3";
  context.fillText(branding.title, brandLeft + (branding.logo ? logoSize + logoGap : 0), titleY);

  context.textAlign = "center";
  context.font = `400 ${10 * unit}px ${fontFamily}`;
  context.fillStyle = "#a4a9b1";
  context.fillText(
    `${branding.subtitle}  ·  dapan.app`,
    canvas.width / 2,
    headerHeight + source.height + footerHeight / 2,
    source.width
  );

  return canvas;
}
