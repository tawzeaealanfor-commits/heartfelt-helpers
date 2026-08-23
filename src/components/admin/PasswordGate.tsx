import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { markPasswordSet } from "@/lib/dashboard.functions";

export function PasswordGate({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const savePasswordSet = useServerFn(markPasswordSet);

  const save = async () => {
    if (password.length < 8) {
      toast.error("كلمة المرور يجب ألا تقل عن 8 أحرف.");
      return;
    }
    if (password !== confirm) {
      toast.error("كلمتا المرور غير متطابقتين.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setLoading(false);
      toast.error("انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.");
      return;
    }
    try {
      await savePasswordSet();
    } catch {
      setLoading(false);
      toast.error("تعذر حفظ الحالة، حاول مرة أخرى.");
      return;
    }
    setLoading(false);
    toast.success("تم حفظ كلمة المرور.");
    onDone();
  };

  return (
    <div className="mx-auto max-w-md">
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">تعيين كلمة المرور</CardTitle>
          <p className="text-sm text-muted-foreground">
            لأنك سجلت الدخول عبر Google لأول مرة، يرجى تعيين كلمة مرور لتسجيل الدخول لاحقًا.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw">كلمة المرور</Label>
            <Input id="pw" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw2">تأكيد كلمة المرور</Label>
            <Input id="pw2" type="password" dir="ltr" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button className="w-full" disabled={loading} onClick={save}>
            حفظ ومتابعة
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
