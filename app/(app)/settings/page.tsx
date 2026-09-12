"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth/session-store";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { canManageSettings } from "@/lib/auth/permissions";
import { getSettings, setAutoAccept } from "@/lib/actions/settings";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { role, fullName } = useSession();
  const [autoAccept, setAutoAcceptState] = useState<boolean | null>(null);
  const manager = role ? canManageSettings(role) : false;

  useEffect(() => {
    getSettings().then((s) => setAutoAcceptState(s.autoAcceptEnabled));
  }, []);

  async function handleToggle(checked: boolean) {
    if (!role) return;
    setAutoAcceptState(checked);
    const updated = await setAutoAccept(checked, fullName || ROLE_LABELS[role]);
    toast.success(updated.autoAcceptEnabled ? "Auto-accept enabled" : "Auto-accept disabled");
  }

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Settings" description="Your profile and platform integration status." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Mock authentication — real deployments connect this to Supabase Auth.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{fullName}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span className="font-medium">{role && ROLE_LABELS[role]}</span></div>
        </CardContent>
      </Card>

      {manager && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fulfilment Automation</CardTitle>
            <CardDescription>Controls how incoming platform orders are handled before a human reviews them.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="auto-accept" className="text-sm font-medium">Auto-accept orders when stock is available</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  New orders with every SKU in stock are accepted and reserved automatically. Orders with a shortage always wait for manual review.
                </p>
              </div>
              <Switch id="auto-accept" checked={autoAccept ?? false} disabled={autoAccept === null} onCheckedChange={handleToggle} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Integrations</CardTitle>
          <CardDescription>Mock adapters simulating live order ingestion.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <IntegrationRow name="Uber Eats" />
          <Separator />
          <IntegrationRow name="Deliveroo" />
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationRow({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{name}</span>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">MOCK</Badge>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
      </div>
    </div>
  );
}
