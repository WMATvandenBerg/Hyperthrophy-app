import { CalendarDays } from "lucide-react";
import { AppCard } from "../components/ui";
import type { AppSeedData } from "../types/models";

export function ScheduleScreen({ data, onOpenDay }: { data: AppSeedData; onOpenDay: (dayId: string) => void }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Schedule</h1>
      <AppCard className="space-y-3">
        <p className="text-sm text-zinc-400">This Week</p>
        {data.training_days.map((day) => (
          <button
            key={day.id}
            type="button"
            onClick={() => onOpenDay(day.id)}
            className="flex w-full items-center gap-3 rounded-2xl bg-surface2 p-3 text-left transition hover:border hover:border-lime/40"
          >
            <div className="grid h-8 w-8 place-items-center rounded-full bg-lime text-black"><CalendarDays className="h-4 w-4" /></div>
            <div>
              <p className="font-medium">Day {day.day_number}: {day.name}</p>
              <p className="text-xs text-zinc-400">{day.muscle_groups.join(", ")}</p>
            </div>
          </button>
        ))}
      </AppCard>
    </div>
  );
}
