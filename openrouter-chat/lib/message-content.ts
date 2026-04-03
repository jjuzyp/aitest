export type MessageBlock =
  | {
      type: "markdown";
      content: string;
    }
  | {
      type: "table";
      headers: string[];
      align: Array<"left" | "center" | "right" | null>;
      rows: string[][];
    };

const EXPANDABLE_HEADER_RE =
  /(название|кампан|товар|продукт|sku|name|product|description|описан)/i;

function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.includes("|") && trimmed.length > 0;
}

function isSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) {
    return false;
  }

  const cells = splitMarkdownRow(trimmed);
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))
  );
}

function splitMarkdownRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) {
    trimmed = trimmed.slice(1);
  }
  if (trimmed.endsWith("|")) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed.split("|").map((cell) => cell.trim());
}

function parseAlignment(separatorLine: string): Array<"left" | "center" | "right" | null> {
  return splitMarkdownRow(separatorLine).map((cell) => {
    const trimmed = cell.trim();
    const left = trimmed.startsWith(":");
    const right = trimmed.endsWith(":");
    if (left && right) {
      return "center";
    }
    if (right) {
      return "right";
    }
    if (left) {
      return "left";
    }
    return null;
  });
}

function chooseExpandableColumn(headers: string[]): number {
  const matchIndex = headers.findIndex((header) =>
    EXPANDABLE_HEADER_RE.test(header),
  );
  if (matchIndex >= 0) {
    return matchIndex;
  }
  return headers.length > 1 ? 1 : 0;
}

function normalizeRowCells(
  cells: string[],
  expectedCells: number,
  expandableColumn: number,
): string[] {
  if (cells.length === expectedCells) {
    return cells;
  }

  if (cells.length < expectedCells) {
    return [...cells, ...Array.from({ length: expectedCells - cells.length }, () => "")];
  }

  const tailCount = Math.max(0, expectedCells - expandableColumn - 1);
  const head = cells.slice(0, expandableColumn);
  const tail = tailCount > 0 ? cells.slice(cells.length - tailCount) : [];
  const middleEnd = tailCount > 0 ? cells.length - tailCount : cells.length;
  const middle = cells.slice(expandableColumn, middleEnd).join("|");
  return [...head, middle, ...tail];
}

function isTableStart(lines: string[], index: number): boolean {
  if (index + 1 >= lines.length) {
    return false;
  }
  return isTableLine(lines[index] || "") && isSeparatorLine(lines[index + 1] || "");
}

export function splitMessageContent(content: string): MessageBlock[] {
  const lines = content.split(/\r?\n/);
  const blocks: MessageBlock[] = [];
  let markdownBuffer: string[] = [];

  function flushMarkdown() {
    if (!markdownBuffer.length) {
      return;
    }
    const joined = markdownBuffer.join("\n").trim();
    if (joined) {
      blocks.push({ type: "markdown", content: joined });
    }
    markdownBuffer = [];
  }

  for (let index = 0; index < lines.length; ) {
    if (!isTableStart(lines, index)) {
      markdownBuffer.push(lines[index] || "");
      index += 1;
      continue;
    }

    flushMarkdown();

    const headerLine = lines[index] || "";
    const separatorLine = lines[index + 1] || "";
    const rowLines: string[] = [];
    let cursor = index + 2;
    while (cursor < lines.length && isTableLine(lines[cursor] || "")) {
      rowLines.push(lines[cursor] || "");
      cursor += 1;
    }

    const headers = splitMarkdownRow(headerLine);
    const align = parseAlignment(separatorLine);
    const expandableColumn = chooseExpandableColumn(headers);
    const rows = rowLines.map((rowLine) =>
      normalizeRowCells(
        splitMarkdownRow(rowLine),
        headers.length,
        expandableColumn,
      ),
    );

    blocks.push({
      type: "table",
      headers,
      align,
      rows,
    });

    index = cursor;
  }

  flushMarkdown();
  return blocks;
}
