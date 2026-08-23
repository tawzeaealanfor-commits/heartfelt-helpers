import { Filter, Plus, Search, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  distinctValues,
  operatorsFor,
  OPERATOR_LABELS,
  type FilterColumn,
  type FilterOperator,
  type FilterRow,
} from "@/lib/filters";

export function DataFilters<T extends Record<string, unknown>>({
  search,
  onSearchChange,
  searchPlaceholder,
  columns,
  rows,
  filters,
  onFiltersChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  columns: FilterColumn[];
  rows: T[];
  filters: FilterRow[];
  onFiltersChange: (filters: FilterRow[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeCount = filters.filter((f) => f.column && f.value !== "").length;

  const addRow = () => {
    const first = columns[0];
    if (!first) return;
    onFiltersChange([
      ...filters,
      {
        id: crypto.randomUUID(),
        column: first.key,
        operator: operatorsFor(first.type)[0] ?? "eq",
        value: "",
      },
    ]);
  };

  const updateRow = (id: string, patch: Partial<FilterRow>) => {
    onFiltersChange(filters.map((f) => (f.id === id ? { ...f, ...f, ...patch } : f)));
  };

  const removeRow = (id: string) => onFiltersChange(filters.filter((f) => f.id !== id));

  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-11 rounded-full bg-card pr-10 pl-4"
        />
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-11 shrink-0 gap-2 rounded-full bg-card"
            aria-label="الفلاتر"
          >
            <Filter className="size-4" />
            الفلاتر
            {activeCount > 0 ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold tabular-nums text-primary-foreground">
                {activeCount}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(92vw,34rem)] space-y-3 rounded-xl p-4"
        >
          {filters.length === 0 ? (
            <p className="text-sm text-muted-foreground">لم تتم إضافة أي فلتر بعد.</p>
          ) : (
            <div className="space-y-2">
              {filters.map((filter) => {
                const column = columns.find((c) => c.key === filter.column) ?? columns[0]!;
                const values = distinctValues(rows, filter.column);
                return (
                  <div key={filter.id} className="flex items-center gap-2 rounded-md bg-muted/60 p-2">
                    <Select
                      value={filter.column}
                      onValueChange={(value) => {
                        const next = columns.find((c) => c.key === value)!;
                        updateRow(filter.id, {
                          column: value,
                          operator: operatorsFor(next.type)[0] ?? "eq",
                          value: "",
                        });
                      }}
                    >
                      <SelectTrigger className="h-9 min-w-0 flex-1 rounded-md bg-card text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((c) => (
                          <SelectItem key={c.key} value={c.key} className="text-xs">
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={filter.operator}
                      onValueChange={(value) =>
                        updateRow(filter.id, { operator: value as FilterOperator })
                      }
                    >
                      <SelectTrigger className="h-9 min-w-0 flex-1 rounded-md bg-card text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operatorsFor(column.type).map((op) => (
                          <SelectItem key={op} value={op} className="text-xs">
                            {OPERATOR_LABELS[op]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={filter.value}
                      onValueChange={(value) => updateRow(filter.id, { value })}
                    >
                      <SelectTrigger className="h-9 min-w-0 flex-1 rounded-md bg-card text-xs">
                        <SelectValue placeholder="القيمة" />
                      </SelectTrigger>
                      <SelectContent>
                        {values.length === 0 ? (
                          <SelectItem value="__none" disabled className="text-xs">
                            لا توجد قيم
                          </SelectItem>
                        ) : (
                          values.map((v) => (
                            <SelectItem key={v} value={v} className="text-xs">
                              {column.format ? column.format(v) : v}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>

                    <button
                      onClick={() => removeRow(filter.id)}
                      aria-label="إزالة الفلتر"
                      className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={addRow}>
            <Plus className="size-4" />
            إضافة فلتر جديد
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
