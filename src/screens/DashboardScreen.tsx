import { Activity, Clock3, HeartPulse } from "lucide-react";
import { AppCard } from "../components/ui";
import { generateProgramInsights, getRpWeekTargetSets } from "../lib/engine";
import type { AppSeedData } from "../types/models";

export function DashboardScreen({
  data,
  onOpenTodayWorkout,
  onOpenScheduledDay,
  onOpenSchedule,
}: {
  data: AppSeedData;
  onOpenTodayWorkout: () => void;
  onOpenScheduledDay: (dayId: string) => void;
  onOpenSchedule: () => void;
}) {
  const chest = data.volumes.find((v) => v.muscle_group === "Chest");
  const progress = chest ? Math.round((chest.current_volume / chest.mrv) * 100) : 0;
  const insights = generateProgramInsights(data);
  const weekTargets = data.volumes.map((v) => ({
    muscle_group: v.muscle_group,
    target_sets: getRpWeekTargetSets({
      mev: v.mev,
      mrv: v.mrv,
      currentWeek: data.program.current_week,
      mesocycleLength: data.program.mesocycle_length,
      deloadWeek: data.program.deload_week,
    }),
  }));
  const totalWeekTarget = weekTargets.reduce((acc, x) => acc + x.target_sets, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Hi {data.user.first_name}</h1>

      <AppCard className="bg-gradient-to-br from-surface to-surface2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Weekly Volume</p>
            <p className="text-3xl font-semibold">{chest?.current_volume ?? 0} sets</p>
            <p className="text-xs text-zinc-400">Target MRV: {chest?.mrv ?? 0}</p>
          </div>
          <div className="grid h-20 w-20 place-items-center rounded-full border-4 border-lime">
            <span className="text-sm font-semibold">{progress}%</span>
          </div>
        </div>
      </AppCard>

      <div className="grid grid-cols-2 gap-3">
        <AppCard className="space-y-2">
          <HeartPulse className="h-5 w-5 text-lime" />
          <p className="text-xs text-zinc-400">Readiness</p>
          <p className="text-xl font-semibold">{insights.readiness_score}/100</p>
          <p className="text-xs text-zinc-400">{insights.readiness_label}</p>
        </AppCard>
        <AppCard className="space-y-2">
          <Clock3 className="h-5 w-5 text-lime" />
          <p className="text-xs text-zinc-400">Workout Time</p>
          <p className="text-xl font-semibold">54 min</p>
          <p className="text-xs text-zinc-400">Trend: {insights.performance_trend}</p>
        </AppCard>
      </div>

      <AppCard className="space-y-2">
        <p className="text-sm text-zinc-400">Program Intelligence</p>
        <p className="text-sm">Target next week: <span className="font-semibold text-lime">{insights.weekly_target_sets} total sets</span></p>
        <p className="text-xs text-zinc-400">
          {insights.deload_flag ? "Deload recommended based on recovery/performance." : "No deload needed. Continue planned progression."}
        </p>
        <div className="space-y-2">
          {insights.recommendations.slice(0, 3).map((r) => (
            <div key={r.muscle_group} className="rounded-2xl bg-surface2 p-2 text-xs text-zinc-300">
              {r.muscle_group}: {r.action.toUpperCase()} to {r.next_week_sets} sets
            </div>
          ))}
        </div>
      </AppCard>

      <AppCard className="space-y-2">
        <p className="text-sm text-zinc-400">RP Weekly Volume Ramp</p>
        <p className="text-xs text-zinc-400">
          Week {data.program.current_week}/{data.program.mesocycle_length}: <span className="font-semibold text-lime">{totalWeekTarget} planned sets</span> across tracked muscles.
        </p>
        <div className="space-y-2">
          {weekTargets.slice(0, 5).map((m) => (
            <div key={m.muscle_group} className="rounded-2xl bg-surface2 p-2 text-xs text-zinc-300">
              {m.muscle_group}: {m.target_sets} sets this week
            </div>
          ))}
        </div>
      </AppCard>

      <button type="button" onClick={onOpenTodayWorkout} className="block w-full text-left">
        <AppCard className="space-y-3 transition hover:border hover:border-lime/50">
          <p className="text-sm text-zinc-400">Today's Exercise</p>
          <div className="h-36 rounded-2xl bg-[url('https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center" />
          <p className="font-semibold">Incline Dumbbell Press</p>
          <p className="text-xs text-zinc-400">4 sets x 8-12 reps @ RIR 2</p>
        </AppCard>
      </button>

      <AppCard className="space-y-3">
        <button type="button" onClick={onOpenSchedule} className="text-xs text-lime underline">
          Open full schedule
        </button>
        <p className="text-sm text-zinc-400">Scheduled Workouts</p>
        {data.training_days.map((day) => (
          <button
            key={day.id}
            type="button"
            onClick={() => onOpenScheduledDay(day.id)}
            className="flex w-full items-center justify-between rounded-2xl bg-surface2 px-3 py-2 text-left transition hover:border hover:border-lime/40"
          >
            <div>
              <p className="text-sm font-medium">Day {day.day_number}: {day.name}</p>
              <p className="text-xs text-zinc-400">{day.muscle_groups.join(" • ")}</p>
            </div>
            <Activity className="h-4 w-4 text-lime" />
          </button>
        ))}
      </AppCard>
    </div>
  );
}
