import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** شريط يعرض رابط تسجيل الدخول الخاص بالبوابة مع إمكانية نسخه. */
export function PortalLinkBar({ label, path }: { label: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = `${origin}${path}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("تم نسخ الرابط");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذر نسخ الرابط");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <code dir="ltr" className="flex-1 truncate rounded-lg bg-muted px-2 py-1 text-xs">
        {url}
      </code>
      <Button size="sm" variant="outline" className="gap-1 rounded-full" onClick={copy}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        نسخ
      </Button>
      <Button asChild size="sm" variant="ghost" className="gap-1 rounded-full">
        <a href={path} target="_blank" rel="noreferrer">
          <ExternalLink className="size-3.5" />
          فتح
        </a>
      </Button>
    </div>
  );
}
