"use client";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

export function CelebrationModal({
  open,
  onClose,
  dayTarget,
  rewardDescription,
}: {
  open: boolean;
  onClose: () => void;
  dayTarget: number;
  rewardDescription?: string | null;
}) {
  useEffect(() => {
    if (!open) return;
    const duration = 1500;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors: ["#2f8f6d", "#e8c178", "#3a3f4b"] });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors: ["#2f8f6d", "#e8c178", "#3a3f4b"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="text-center">
        <DialogHeader className="items-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Trophy className="h-7 w-7" />
          </div>
          <DialogTitle>{dayTarget} days. You did that.</DialogTitle>
          <DialogDescription>
            That's real, sustained effort — not luck. Take a moment to actually feel proud of it.
          </DialogDescription>
        </DialogHeader>
        {rewardDescription && (
          <div className="mb-4 rounded-lg bg-secondary p-3 text-sm">
            🎁 Don't forget your reward: <span className="font-medium">{rewardDescription}</span>
          </div>
        )}
        <Button className="w-full" onClick={onClose}>
          Keep going
        </Button>
      </DialogContent>
    </Dialog>
  );
}
