import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="space-y-2 p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="rounded-md bg-muted/60 px-3 py-2 text-2xl font-semibold tabular-nums">
          {value}
          {unit ? <span className="mr-1 text-sm font-normal text-muted-foreground">{unit}</span> : null}
        </p>
      </CardContent>
    </Card>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="grid grid-cols-2 gap-3 md:gap-4">{children}</div>
    </section>
  );
}
