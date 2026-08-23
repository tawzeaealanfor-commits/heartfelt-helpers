import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { groupPermissions, type PermissionRow } from "@/lib/roles";

export function PermissionMatrix({
  permissions,
  selected,
  onChange,
  disabled = false,
}: {
  permissions: PermissionRow[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return permissions;
    return permissions.filter(
      (p) =>
        p.label.toLowerCase().includes(term) ||
        p.key.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term),
    );
  }, [permissions, search]);

  const groups = groupPermissions(filtered);
  const selectedSet = new Set(selected);

  const toggle = (key: string, next: boolean) => {
    if (disabled) return;
    const set = new Set(selected);
    if (next) set.add(key);
    else set.delete(key);
    onChange(Array.from(set));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث داخل الصلاحيات"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-full pr-9"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={disabled}
          onClick={() => onChange(permissions.map((p) => p.key))}
        >
          تحديد الكل
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={disabled}
          onClick={() => onChange([])}
        >
          إلغاء الكل
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد صلاحيات مطابقة.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map(([category, items]) => (
            <Card key={category} className="rounded-xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {items.map((permission) => (
                  <div key={permission.key} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{permission.label}</p>
                      <p className="truncate text-xs text-muted-foreground" dir="ltr">
                        {permission.key}
                      </p>
                    </div>
                    <Switch
                      checked={selectedSet.has(permission.key)}
                      disabled={disabled}
                      onCheckedChange={(next) => toggle(permission.key, next)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
