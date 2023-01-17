const padL = (text: string, width: number): string => {
  return `${text}${" ".repeat(Math.max(0, width - text.length))}`;
};

const padR = (text: string, width: number): string => {
  return `${" ".repeat(Math.max(0, width - text.length))}${text}`;
};

const padC = (text: string, width: number): string => {
  const l = " ".repeat(Math.ceil(Math.max(0, width - text.length) / 2));
  const r = " ".repeat(Math.floor(Math.max(0, width - text.length) / 2));
  return `${l}${text}${r}`;
};

const pad = (
  text: string,
  width: number,
  alignment: "left" | "right" | "center"
): string => {
  if (alignment === "right") return padR(text, width);
  if (alignment === "left") return padL(text, width);
  return padC(text, width);
};

export type MDTableColumn = {
  title: string;
  alignment: "left" | "center" | "right";
};

export default class MD {
  private _lines: string[];

  constructor(text: string = "") {
    this._lines = text ? [text] : [];
  }

  static start(text = ""): MD {
    return new MD(text);
  }

  static bi(text: string): string {
    return text ? `***${text}***` : "";
  }

  static b(text: string): string {
    return text ? `**${text}**` : "";
  }

  static i(text: string): string {
    return text ? `_${text}_` : "";
  }

  static s(text: string): string {
    return text ? `~~${text}~~` : "";
  }

  end(): string {
    return this._lines.join("\n\n");
  }

  par(text: string): MD {
    this._lines.push(text);
    return this;
  }

  pars(texts: string[]): MD {
    texts.forEach((text) => this._lines.push(text));
    return this;
  }

  title(text: string): MD {
    this._lines.push(`# ${text}`);
    return this;
  }

  section(text: string): MD {
    this._lines.push(`## ${text}`);
    return this;
  }

  subsection(text: string): MD {
    this._lines.push(`### ${text}`);
    return this;
  }

  ordered(texts: string[]): MD {
    this._lines.push(texts.map((text, i) => `${i + 1}. ${text}`).join("\n"));
    return this;
  }

  unordered(texts: string[]): MD {
    this._lines.push(texts.map((text) => `- ${text}`).join("\n"));
    return this;
  }

  table(columns: MDTableColumn[], rows: string[][]): MD {
    if (columns.length === 0) {
      return this;
    }

    const columnCount = Math.max(
      columns.length,
      ...rows.map((row) => row.length)
    );

    const extendedColumns: MDTableColumn[] = [];
    for (let i = 0; i < columnCount; ++i) {
      extendedColumns.push(columns[i] ?? { title: "", alignment: "left" });
    }

    const extendedRows: string[][] = [];
    rows.forEach((row) => {
      const extendedRow = [];
      for (let i = 0; i < columnCount; ++i) {
        extendedRow.push(row[i] ?? "");
      }
      extendedRows.push(extendedRow);
    });

    columns = extendedColumns;
    rows = extendedRows;

    const columnWidths: number[] = [];
    for (let i = 0; i < columnCount; ++i) {
      columnWidths[i] = Math.max(columns[i].title.length, 3);
      for (const row of rows) {
        columnWidths[i] = Math.max(columnWidths[i], row[i].length);
      }
    }

    const lines: string[] = [];

    lines.push(
      `| ${columns
        .map((column, i) => padL(column.title, columnWidths[i]))
        .join(" | ")} |`
    );

    lines.push(
      `| ${columns
        .map(
          (column, i) =>
            (column.alignment === "center" ? ":" : "-") +
            "-".repeat(columnWidths[i] - 2) +
            (column.alignment === "left" ? "-" : ":")
        )
        .join(" | ")} |`
    );

    rows.forEach((row) => {
      lines.push(
        `| ${row
          .map((cell, i) => pad(cell, columnWidths[i], columns[i].alignment))
          .join(" | ")} |`
      );
    });

    this._lines.push(lines.join("\n"));

    return this;
  }
}
