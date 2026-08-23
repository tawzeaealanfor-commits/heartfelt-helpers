import { CalendarDays } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type DateRange = { from: string; to: string };

const toInput = (d: Date) => d.toISOString().slice(0, 10);

const PRESETS: { label: string; days: number }[] = [
  { label: "آخر 7 أيام", days: 7 },
  { label: "آخر 30 يوم", days: 30 },
  { label: "آخر 90 يوم", days: 90 },
];

function rangeForDays(days: number): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: toInput(from), to: toInput(to) };
}

const shortLabel = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });

/** شريط مبسّط لاختيار الفترة الزمنية: أيقونة + فترات جاهزة + نطاق مخصص. */
export function DateRangeBar({
  range,
  onChange,
}: {
  range: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(range);

  const apply = (next: DateRange) => {
    setDraft(next);
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setDraft(range);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 rounded-full bg-card px-3 text-xs font-medium"
          aria-label="اختيار الفترة الزمنية"
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          <span className="tabular-nums">
            {shortLabel(range.from)} — {shortLabel(range.to)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(90vw,20rem)] space-y-3 rounded-xl p-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.days}
              variant="secondary"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => apply(rangeForDays(preset.days))}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">من</label>
            <Input
              type="date"
              value={draft.from}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
              className="h-9 rounded-md text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">إلى</label>
            <Input
              type="date"
              value={draft.to}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
              className="h-9 rounded-md text-xs"
            />
          </div>
        </div>

        <Button size="sm" className="w-full rounded-full" onClick={() => apply(draft)}>
          تطبيق
        </Button>
      </PopoverContent>
    </Popover>
  );
}
