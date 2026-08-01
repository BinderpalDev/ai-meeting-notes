import { CalendarDays, CheckCircle2, ListChecks } from "lucide-react";
import type { ActionItem } from "@/data/mockRecordings";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  items: ActionItem[];
  onToggle: (id: string) => void;
};

export function ActionItems({ items, onToggle }: Props) {
  if (items.length === 0) {
    return (
      <div className="panel flex flex-col items-center gap-2 p-10 text-center">
        <ListChecks className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">No action items yet</p>
        <p className="text-sm text-muted-foreground">
          Process this recording and Summarix will extract owners and due dates.
        </p>
      </div>
    );
  }

  const done = items.filter((i) => i.done).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-mint" />
        <span>
          {done} of {items.length} complete
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-mint transition-all duration-500 glow-mint"
            style={{ width: `${(done / items.length) * 100}%` }}
          />
        </div>
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "panel group flex items-start gap-3 p-4 transition-all duration-200 hover:border-primary/40",
            item.done && "opacity-60",
          )}
        >
          <Checkbox
            checked={item.done}
            onCheckedChange={() => onToggle(item.id)}
            className="mt-0.5 shrink-0 data-[state=checked]:border-mint data-[state=checked]:bg-mint data-[state=checked]:text-mint-foreground"
            aria-label={`Mark "${item.text}" complete`}
          />
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-medium", item.done && "line-through")}>{item.text}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/20 text-[10px] font-semibold text-foreground">
                  {item.initials}
                </span>
                {item.assignee}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {item.due}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
