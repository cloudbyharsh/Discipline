"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hashPin } from "@/lib/pin";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Settings } from "@/types/database";

export function PinLockSettings({ settings }: { settings: Settings }) {
  const router = useRouter();
  const supabase = createClient();
  const setUnlocked = useAppStore((s) => s.setUnlocked);
  const [enabled, setEnabled] = useState(settings.pin_lock_enabled);
  const [biometric, setBiometric] = useState(settings.biometric_enabled);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [editingPin, setEditingPin] = useState(!settings.pin_lock_enabled);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleToggle(checked: boolean) {
    setError(null);
    if (!checked) {
      setEnabled(false);
      await supabase.from("settings").update({ pin_lock_enabled: false }).eq("user_id", settings.user_id);
      setUnlocked(true);
      router.refresh();
      return;
    }
    setEnabled(true);
    setEditingPin(true);
  }

  async function handleSavePin() {
    setError(null);
    if (!/^\d{4,6}$/.test(pin)) {
      setError("PIN must be 4-6 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs don't match.");
      return;
    }
    setSaving(true);
    const pin_code_hash = await hashPin(pin);
    await supabase.from("settings").update({ pin_lock_enabled: true, pin_code_hash }).eq("user_id", settings.user_id);
    setSaving(false);
    setEditingPin(false);
    setPin("");
    setConfirmPin("");
    setUnlocked(true);
    router.refresh();
  }

  async function handleBiometricToggle(checked: boolean) {
    setBiometric(checked);
    await supabase.from("settings").update({ biometric_enabled: checked }).eq("user_id", settings.user_id);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>App lock</CardTitle>
        <CardDescription>Require a PIN to open the app — useful if you share a device.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="pin-enabled">PIN lock</Label>
          <Switch id="pin-enabled" checked={enabled} onCheckedChange={handleToggle} />
        </div>

        {enabled && editingPin && (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="space-y-1.5">
              <Label htmlFor="pin">New PIN (4-6 digits)</Label>
              <Input id="pin" type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pin">Confirm PIN</Label>
              <Input
                id="confirm-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button size="sm" onClick={handleSavePin} disabled={saving}>
              {saving ? "Saving…" : "Save PIN"}
            </Button>
          </div>
        )}

        {enabled && !editingPin && (
          <Button size="sm" variant="outline" onClick={() => setEditingPin(true)}>
            Change PIN
          </Button>
        )}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <Label htmlFor="biometric">Biometric unlock</Label>
            <p className="text-xs text-muted-foreground">Uses your device's Face ID / fingerprint where supported.</p>
          </div>
          <Switch id="biometric" checked={biometric} onCheckedChange={handleBiometricToggle} />
        </div>
      </CardContent>
    </Card>
  );
}
