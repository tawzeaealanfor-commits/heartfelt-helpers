export type FilterOperator = "eq" | "neq" | "contains" | "gt" | "lt";

export type FilterRow = {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string;
};

export type FilterColumn = {
  key: string;
  label: string;
  type: "text" | "number" | "enum";
  format?: (raw: string) => string;
};

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: "يساوي",
  neq: "لا يساوي",
  contains: "يحتوي على",
  gt: "أكبر من",
  lt: "أصغر من",
};

export function operatorsFor(type: FilterColumn["type"]): FilterOperator[] {
  if (type === "number") return ["eq", "neq", "gt", "lt"];
  if (type === "enum") return ["eq", "neq"];
  return ["eq", "neq", "contains"];
}

export function distinctValues<T extends Record<string, unknown>>(rows: T[], key: string): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const raw = row[key];
    if (raw === null || raw === undefined || raw === "") continue;
    set.add(String(raw));
  }
  return Array.from(set).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b, "ar");
  });
}

export function applyFilters<T extends Record<string, unknown>>(
  rows: T[],
  filters: FilterRow[],
  columns: FilterColumn[],
): T[] {
  const active = filters.filter((f) => f.column && f.value !== "");
  if (active.length === 0) return rows;

  return rows.filter((row) =>
    active.every((filter) => {
      const column = columns.find((c) => c.key === filter.column);
      const raw = row[filter.column];
      if (column?.type === "number") {
        const a = Number(raw);
        const b = Number(filter.value);
        if (Number.isNaN(a) || Number.isNaN(b)) return false;
        if (filter.operator === "gt") return a > b;
        if (filter.operator === "lt") return a < b;
        if (filter.operator === "neq") return a !== b;
        return a === b;
      }
      const a = String(raw ?? "");
      const b = filter.value;
      if (filter.operator === "contains") return a.includes(b);
      if (filter.operator === "neq") return a !== b;
      return a === b;
    }),
  );
}
