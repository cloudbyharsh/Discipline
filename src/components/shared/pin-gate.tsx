"use client";
import { useState } from "react";
import { Lock } from "lucide-react";
import { hashPin } from "@/lib/pin";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import type { Settings } from "@/types/database";

export function PinGate({ settings, children }: { settings: Settings | null; children: React.ReactNode }) {
  const isUnlocked = useAppStore((s) => s.isUnlocked);
  const setUnlocked = useAppStore((s) => s.setUnlocked);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const locked = !!settings?.pin_lock_enabled && !!settings.pin_code_hash && !isUnlocked;

  async function handleUnlock() {
    if (!settings?.pin_code_hash) return;
    setChecking(true);
    setError(null);
    const hash = await hashPin(pin);
    setChecking(false);
    if (hash === settings.pin_code_hash) {
      setUnlocked(true);
      setPin("");
    } else {
      setError("Incorrect PIN.");
      setPin("");
    }
  }

  if (!locked) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Lock className="h-6 w-6" />
      </div>
      <div className="text-center">
        <h1 className="text-lg font-semibold">Enter your PIN</h1>
        <p className="text-sm text-muted-foreground">Discipline is locked for your privacy.</p>
      </div>
      <input
        type="password"
        inputMode="numeric"
        maxLength={6}
        autoFocus
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
        className="w-40 rounded-lg border border-input bg-background px-3 py-2 text-center text-lg tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleUnlock} disabled={pin.length < 4 || checking} className="w-40">
        {checking ? "Checking…" : "Unlock"}
      </Button>
    </div>
  );
}
