import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PATHS } from "@/config";

type BurndownPoint = {
  date: string;
  remaining: number;
};

type BurndownData =
  | (BurndownPoint[] & { baseline?: never })
  | {
      baseline?: number;
      points?: BurndownPoint[];
    };

type ExcalidrawElement = {
  id: string;
  type: string;
  [key: string]: unknown;
};

function randomId(prefix: string): string {
  return `${prefix}${Math.random().toString(16).slice(2, 10)}`;
}

function randomInt(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createLineElement(params: {
  x: number;
  y: number;
  points: [number, number][];
  strokeColor?: string;
  strokeWidth?: number;
}): ExcalidrawElement {
  const { x, y, points, strokeColor = "#1e1e1e", strokeWidth = 2 } = params;

  const xs = points.map(([px]) => px);
  const ys = points.map(([, py]) => py);

  return {
    id: randomId("ln"),
    type: "line",
    x,
    y,
    width: xs.length ? Math.max(...xs) - Math.min(...xs) : 0,
    height: ys.length ? Math.max(...ys) - Math.min(...ys) : 0,
    angle: 0,
    strokeColor,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: randomInt(),
    version: 1,
    versionNonce: randomInt(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    points,
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: null,
  };
}

function createTextElement(params: {
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  strokeColor?: string;
  fontWeight?: number;
}): ExcalidrawElement {
  const {
    x,
    y,
    text,
    fontSize = 16,
    strokeColor = "#1e1e1e",
    fontWeight = 400,
  } = params;

  const width = Math.max(16, text.length * fontSize * 0.6);
  const height = fontSize * 1.4;

  return {
    id: randomId("tx"),
    type: "text",
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor,
    fontWeight: fontWeight,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: randomInt(),
    version: 1,
    versionNonce: randomInt(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    text,
    fontSize,
    fontFamily: 1,
    textAlign: "left",
    verticalAlign: "top",
    baseline: fontSize,
    containerId: null,
    originalText: text,
    lineHeight: 1.25,
  };
}

function createRectangleElement(params: {
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
}): ExcalidrawElement {
  const {
    x,
    y,
    width,
    height,
    strokeColor = "#1e1e1e",
    backgroundColor = "transparent",
    strokeWidth = 1,
  } = params;

  return {
    id: randomId("rc"),
    type: "rectangle",
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor,
    backgroundColor,
    fillStyle: "solid",
    strokeWidth,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: randomInt(),
    version: 1,
    versionNonce: randomInt(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
  };
}

function normalizeBurndownData(input: BurndownData): {
  baseline: number;
  points: BurndownPoint[];
} {
  if (Array.isArray(input)) {
    const baseline = Math.max(...input.map((point) => point.remaining), 1);
    return { baseline, points: input };
  }

  const points = Array.isArray(input.points) ? input.points : [];
  const baseline = Math.max(
    input.baseline ?? 0,
    ...points.map((point) => point.remaining),
    1
  );

  return { baseline, points };
}

function measureTextWidth(text: string, fontSize: number): number {
  return Math.max(16, text.length * fontSize * 0.6);
}

function collectTextElements(elements: ExcalidrawElement[]): string {
  return elements
    .filter(
      (element) => element.type === "text" && typeof element.text === "string"
    )
    .map((element) => `${String(element.text)} ^${element.id}`)
    .join("\n");
}

function buildExcalidrawMarkdown(elements: ExcalidrawElement[]): string {
  const excalidrawData = {
    type: "excalidraw",
    version: 2,
    source:
      "https://github.com/zsviczian/obsidian-excalidraw-plugin/releases/tag/2.20.6",
    elements,
    appState: {
      gridSize: null,
      viewBackgroundColor: "#ffffff",
    },
    files: {},
  };

  const textElements = collectTextElements(elements);

  return `---
excalidraw-plugin: parsed
tags: [excalidraw]
---
==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠== You can decompress Drawing data with the command palette: 'Decompress current Excalidraw file'. For more info check in plugin settings under 'Saving'

# Excalidraw Data

## Text Elements
${textElements}

## Drawing
\`\`\`json
${JSON.stringify(excalidrawData, null, "\t")}
\`\`\`
`;
}

function buildChartElements(
  points: BurndownPoint[],
  baseline: number
): ExcalidrawElement[] {
  const elements: ExcalidrawElement[] = [];

  const canvasX = 40;
  const canvasY = 40;
  const canvasWidth = 1460;
  const canvasHeight = 950;

  const chartX = 120;
  const chartY = 180;
  const chartWidth = 1320;
  const chartHeight = 620;

  // background
  elements.push(
    createRectangleElement({
      x: canvasX,
      y: canvasY,
      width: canvasWidth,
      height: canvasHeight,
      strokeColor: "#ffffff",
      backgroundColor: "#ffffff",
      strokeWidth: 0,
    })
  );

  // top-right label on the same line
  const lastPoint = points.at(-1);

  const titleText = "Burndown Sprint";
  const titleFontSize = 28;

  const remainingText = `Current remaining: ${lastPoint?.remaining ?? 0}`;
  const remainingFontSize = 18;

  const remainingWidth = measureTextWidth(remainingText, remainingFontSize);

  elements.push(
    createTextElement({
      x: chartX,
      y: 90,
      text: titleText,
      fontSize: titleFontSize,
    })
  );

  elements.push(
    createTextElement({
      x: chartX + chartWidth - remainingWidth,
      y: 90,
      text: remainingText,
      fontSize: remainingFontSize,
    })
  );

  elements.push(
    createRectangleElement({
      x: chartX,
      y: chartY,
      width: chartWidth,
      height: chartHeight,
      strokeColor: "#d0d0d0",
      backgroundColor: "#ffffff",
      strokeWidth: 1,
    })
  );

  elements.push(
    createLineElement({
      x: chartX,
      y: chartY + chartHeight,
      points: [
        [0, 0],
        [chartWidth, 0],
      ],
      strokeWidth: 2,
      strokeColor: "#1e1e1e",
    })
  );

  elements.push(
    createLineElement({
      x: chartX,
      y: chartY,
      points: [
        [0, 0],
        [0, chartHeight],
      ],
      strokeWidth: 2,
      strokeColor: "#1e1e1e",
    })
  );

  if (points.length === 0) {
    elements.push(
      createTextElement({
        x: chartX + 24,
        y: chartY + 24,
        text: "No burndown data found",
        fontSize: 18,
      })
    );
    return elements;
  }

  const maxRemaining = Math.max(
    baseline,
    ...points.map((point) => point.remaining),
    1
  );
  const xStep = points.length > 1 ? chartWidth / (points.length - 1) : 0;

  for (let i = 0; i <= 5; i++) {
    const value = Math.round((maxRemaining / 5) * i);
    const y = chartY + chartHeight - (chartHeight / 5) * i;

    elements.push(
      createLineElement({
        x: chartX,
        y,
        points: [
          [0, 0],
          [chartWidth, 0],
        ],
        strokeColor: "#ececec",
        strokeWidth: 1,
      })
    );

    elements.push(
      createTextElement({
        x: chartX - 55,
        y: y - 10,
        text: String(value),
        fontSize: 14,
        strokeColor: "#666666",
      })
    );
  }

  points.forEach((point, index) => {
    const x = chartX + index * xStep;

    elements.push(
      createLineElement({
        x,
        y: chartY,
        points: [
          [0, 0],
          [0, chartHeight],
        ],
        strokeColor: "#f3f3f3",
        strokeWidth: 1,
      })
    );

    const isEven = index % 2 === 0;
    if (!isEven) return;
    elements.push(
      createTextElement({
        x: x - 18,
        y: chartY + chartHeight + 16,
        text: point.date.slice(5),
        fontSize: 16,
        strokeColor: "#000",
        fontWeight: 700,
      })
    );
  });

  const today = getLocalDateString();

  const actualLinePoints: [number, number][] = points
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => point.date <= today)
    .map(({ point, index }) => {
      const x = index * xStep;
      const y = -((point.remaining / maxRemaining) * chartHeight);
      return [x, y];
    });

  if (actualLinePoints.length > 0) {
    elements.push(
      createLineElement({
        x: chartX,
        y: chartY + chartHeight,
        points: actualLinePoints,
        strokeColor: "#e03131",
        strokeWidth: 3,
      })
    );
  }

  const firstRemaining = points[0]?.remaining ?? 0;
  const idealLinePoints: [number, number][] =
    points.length > 1
      ? [
          [0, -((firstRemaining / maxRemaining) * chartHeight)],
          [chartWidth, 0],
        ]
      : [[0, -((firstRemaining / maxRemaining) * chartHeight)]];

  elements.push(
    createLineElement({
      x: chartX,
      y: chartY + chartHeight,
      points: idealLinePoints,
      strokeColor: "#339af0",
      strokeWidth: 2,
    })
  );

  return elements;
}

export async function buildBurndownExcalidraw(): Promise<string> {
  await mkdir(PATHS.excalidrawDir, { recursive: true });

  const raw = await readFile(PATHS.burndownFile, "utf8");
  const parsed = JSON.parse(raw) as BurndownData;

  const { baseline, points } = normalizeBurndownData(parsed);

  const elements = buildChartElements(points, baseline);
  const markdown = buildExcalidrawMarkdown(elements);

  await writeFile(PATHS.burndownExcalidrawFile, markdown, "utf8");

  console.log(`Saved burndown excalidraw to ${PATHS.burndownExcalidrawFile}`);
  return markdown;
}
