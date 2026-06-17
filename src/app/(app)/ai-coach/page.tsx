import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AICoachPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Card className="max-w-md">
        <CardContent className="space-y-4 pt-8 pb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold">AI Coach — Coming soon</h1>
          <p className="text-sm text-muted-foreground">
            Every check-in, mood, and trigger you log is quietly building the picture we'll use here: spotting your
            personal patterns, flagging high-risk moments before they happen, and giving you coaching that's
            actually about you — not generic advice.
          </p>
          <p className="text-xs text-muted-foreground">
            Keep checking in. The more data you build, the better this gets.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
