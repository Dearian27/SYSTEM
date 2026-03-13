import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PATHS } from "@/config";
import type { BurndownData } from "@/types";

async function readBurndownData(): Promise<BurndownData> {
  const raw = await readFile(PATHS.burndownFile, "utf8");
  return JSON.parse(raw) as BurndownData;
}

function buildPolylinePoints(
  remainingValues: number[],
  width: number,
  height: number,
  padding: number
): string {
  const maxValue = Math.max(...remainingValues, 1);
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  return remainingValues
    .map((value, index) => {
      const x =
        remainingValues.length === 1
          ? padding
          : padding + (index / (remainingValues.length - 1)) * chartWidth;

      const y = padding + (1 - value / maxValue) * chartHeight;

      return `${x},${y}`;
    })
    .join(" ");
}

function buildSvg(data: BurndownData): string {
  const width = 900;
  const height = 360;
  const padding = 40;

  const remainingValues = data.points.map((p) => p.remaining);
  const polylinePoints = buildPolylinePoints(
    remainingValues,
    width,
    height,
    padding
  );

  const xAxisY = height - padding;
  const yAxisX = padding;

  const labels = data.points
    .filter((_, index, arr) => {
      if (arr.length <= 8) return true;
      const step = Math.ceil(arr.length / 8);
      return index % step === 0 || index === arr.length - 1;
    })
    .map((point, index, arr) => {
      const fullIndex = data.points.findIndex((p) => p.date === point.date);
      const x =
        data.points.length === 1
          ? padding
          : padding +
            (fullIndex / (data.points.length - 1)) * (width - padding * 2);

      return `<text x="${x}" y="${
        height - 10
      }" font-size="12" text-anchor="middle">${point.date.slice(5)}</text>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${width}" height="${height}" fill="white"/>
  <text x="${padding}" y="24" font-size="18" font-family="Arial">Burndown — ${
    data.sprintName
  }</text>

  <line x1="${yAxisX}" y1="${padding}" x2="${yAxisX}" y2="${xAxisY}" stroke="black" stroke-width="2"/>
  <line x1="${yAxisX}" y1="${xAxisY}" x2="${
    width - padding
  }" y2="${xAxisY}" stroke="black" stroke-width="2"/>

  <polyline
    fill="none"
    stroke="#f2a100"
    stroke-width="4"
    stroke-linecap="round"
    stroke-linejoin="round"
    points="${polylinePoints}"
  />

  ${labels}
</svg>`;
}

async function main(): Promise<void> {
  await mkdir(PATHS.dashboardDir, { recursive: true });

  const data = await readBurndownData();
  const svg = buildSvg(data);

  await writeFile(PATHS.burndownSvgFile, svg, "utf8");
  console.log(`Burndown SVG saved to ${PATHS.burndownSvgFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
