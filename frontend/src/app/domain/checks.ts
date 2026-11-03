import { colorUsage, Pattern } from './pattern';

/** Something in a chart that is worth a second look. */
export type Finding =
  | { kind: 'isolated'; x: number; y: number; color: number }
  | { kind: 'unusedColor'; color: number }
  | { kind: 'similarColors'; color: number; otherColor: number }
  | { kind: 'unevenRow'; y: number; count: number; expected: number };

/** Colours closer than this distance in RGB space cannot be told apart in thread or yarn. */
const SIMILAR_COLOR_DISTANCE = 12;

/** Single stitches of a colour are slow to stitch and mostly a leftover. */
function isolatedStitches(pattern: Pattern): Finding[] {
  const { width, height, cells } = pattern;
  const findings: Finding[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const color = cells[index] ?? 0;
      const alone =
        color > 0 &&
        (x === 0 || cells[index - 1] !== color) &&
        (x === width - 1 || cells[index + 1] !== color) &&
        (y === 0 || cells[index - width] !== color) &&
        (y === height - 1 || cells[index + width] !== color);
      if (alone) {
        findings.push({ kind: 'isolated', x, y, color });
      }
    }
  }
  return findings;
}

function unusedColors(pattern: Pattern): Finding[] {
  return colorUsage(pattern).flatMap((count, index) =>
    count === 0 ? [{ kind: 'unusedColor' as const, color: index + 1 }] : [],
  );
}

function similarColors(pattern: Pattern): Finding[] {
  const channels = pattern.palette.map((hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]);
  const findings: Finding[] = [];
  channels.forEach(([red = 0, green = 0, blue = 0], first) => {
    for (let second = first + 1; second < channels.length; second++) {
      const [otherRed = 0, otherGreen = 0, otherBlue = 0] = channels[second] ?? [];
      const distance = Math.hypot(red - otherRed, green - otherGreen, blue - otherBlue);
      if (distance < SIMILAR_COLOR_DISTANCE) {
        findings.push({ kind: 'similarColors', color: first + 1, otherColor: second + 1 });
      }
    }
  });
  return findings;
}

/**
 * A row whose stitch count differs while the rows before and after it agree. Shapes that grow or
 * shrink evenly stay out of it, because there the neighbours differ from each other too.
 */
function unevenRows(pattern: Pattern): Finding[] {
  const { symbols, width, height } = pattern;
  if (!symbols) {
    return [];
  }
  const rows: { y: number; count: number }[] = [];
  for (let y = 0; y < height; y++) {
    const count = symbols.slice(y * width, (y + 1) * width).filter((id) => id > 0).length;
    if (count > 0) {
      rows.push({ y, count });
    }
  }
  const findings: Finding[] = [];
  for (let index = 1; index < rows.length - 1; index++) {
    const before = (rows[index - 1] as { count: number }).count;
    const after = (rows[index + 1] as { count: number }).count;
    const { y, count } = rows[index] as { y: number; count: number };
    if (before === after && count !== before) {
      findings.push({ kind: 'unevenRow', y, count, expected: before });
    }
  }
  return findings;
}

/**
 * Looks through a chart for likely mistakes. Which checks apply depends on the craft. Findings
 * about the whole chart come first, because single stitches can run into the thousands.
 */
export function checkPattern(pattern: Pattern): Finding[] {
  const colorChart = pattern.craftType === 'crossStitch' || pattern.craftType === 'pixelArt';
  return [
    ...unusedColors(pattern),
    ...similarColors(pattern),
    ...unevenRows(pattern),
    ...(colorChart ? isolatedStitches(pattern) : []),
  ];
}

/** A finding as a sentence, with rows and columns counted from one as on the chart. */
export function findingText(finding: Finding, pattern: Pattern): string {
  const color = (number: number) => pattern.palette[number - 1] ?? '';
  switch (finding.kind) {
    case 'isolated':
      return `Single stitch in row ${finding.y + 1}, column ${finding.x + 1}`;
    case 'unusedColor':
      return `${color(finding.color)} is not used`;
    case 'similarColors':
      return `${color(finding.color)} and ${color(finding.otherColor)} look almost the same`;
    case 'unevenRow':
      return `Row ${finding.y + 1} has ${finding.count} stitches, the rows around it have ${finding.expected}`;
  }
}
