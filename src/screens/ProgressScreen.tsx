import { useMemo, useState } from "react";
import { AppCard, SelectChip } from "../components/ui";
import { computeReadiness } from "../lib/engine";
import type { AppSeedData } from "../types/models";

export function ProgressScreen({ data }: { data: AppSeedData }) {
  const [range, setRange] = useState<"Week" | "Month" | "All">("Week");

  const filteredLogs = useMemo(() => {
    if (range === "All") return data.logs;
    const days = range === "Week" ? 7 : 30;
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
    return data.logs.filter((l) => {
      const ts = l.sets_completed[0]?.completed_at;
      return ts ? +new Date(ts) >= threshold : false;
    });
  }, [data.logs, range]);

  const weeklyVolumes = useMemo(() => {
    const buckets = [0, 0, 0, 0];
    const now = Date.now();
    filteredLogs.forEach((log) => {
      const ts = +new Date(log.sets_completed[0]?.completed_at ?? 0);
      const ageDays = Math.floor((now - ts) / (1000 * 60 * 60 * 24));
      const idx = Math.min(3, Math.max(0, Math.floor(ageDays / 7)));
      buckets[idx] += log.total_volume_kg;
    });
    return buckets.reverse();
  }, [filteredLogs]);

  const stats = useMemo(
    () => ({
      totalVolume: filteredLogs.reduce((acc, l) => acc + l.total_volume_kg, 0),
      workouts: filteredLogs.length,
      avgVolume: Math.round((filteredLogs.reduce((acc, l) => acc + l.total_volume_kg, 0) || 1) / Math.max(filteredLogs.length, 1)),
      consistency: `${Math.min(100, Math.round((filteredLogs.length / (range === "Week" ? 4 : range === "Month" ? 16 : 30)) * 100))}%`,
    }),
    [filteredLogs, range],
  );

  const missedSetReasons = useMemo(() => {
    const counts = new Map<string, number>();
    filteredLogs.forEach((l) => {
      if (!l.unused_sets || l.unused_sets <= 0 || !l.unused_set_reason) return;
      counts.set(l.unused_set_reason, (counts.get(l.unused_set_reason) ?? 0) + l.unused_sets);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [filteredLogs]);

  const latestCheckin = [...data.checkins].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
  const readiness = computeReadiness(latestCheckin);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Progress</h1>
      <div className="grid grid-cols-3 gap-2">
        {(["Week", "Month", "All"] as const).map((r) => (
          <SelectChip key={r} label={r} selected={range === r} onClick={() => setRange(r)} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <AppCard><p className="text-xs text-zinc-400">Total Volume</p><p className="text-xl font-semibold">{stats.totalVolume} kg</p></AppCard>
        <AppCard><p className="text-xs text-zinc-400">Workouts</p><p className="text-xl font-semibold">{stats.workouts}</p></AppCard>
        <AppCard><p className="text-xs text-zinc-400">Avg Volume</p><p className="text-xl font-semibold">{stats.avgVolume} kg</p></AppCard>
        <AppCard><p className="text-xs text-zinc-400">Readiness</p><p className="text-xl font-semibold">{readiness}/100</p></AppCard>
      </div>

      <AppCard className="space-y-3">
        <p className="text-sm text-zinc-400">Weekly Volume</p>
        <div className="flex h-36 items-end gap-2">
          {weeklyVolumes.map((w, idx) => (
            <div key={idx} className="flex-1 rounded-t-xl bg-lime/90" style={{ height: `${Math.max(10, (w / Math.max(...weeklyVolumes, 1)) * 100)}%` }} />
          ))}
        </div>
      </AppCard>

      <AppCard className="space-y-3">
        <p className="text-sm text-zinc-400">Recent Check-ins</p>
        {data.checkins.map((c) => (
          <div key={c.id} className="rounded-2xl bg-surface2 p-3 text-sm">
            <p className="mb-1 text-xs text-zinc-400">{new Date(c.created_at).toLocaleDateString()}</p>
            <p>Fatigue {c.fatigue_level}/10 • Sleep {c.sleep_quality}/10 • Stress {c.stress_level}/10</p>
          </div>
        ))}
      </AppCard>

      <AppCard className="space-y-3">
        <p className="text-sm text-zinc-400">Program Review Signals</p>
        {missedSetReasons.length ? (
          missedSetReasons.map(([reason, count]) => (
            <div key={reason} className="rounded-2xl bg-surface2 p-3 text-sm">
              <p className="font-medium">{formatReason(reason)}</p>
              <p className="text-xs text-zinc-400">Missed sets attributed: {count}</p>
            </div>
          ))
        ) : (
          <p className="text-xs text-zinc-400">No missed set reasons logged in this timeframe.</p>
        )}
      </AppCard>
    </div>
  );
}

function formatReason(reason: string) {
  return reason
    .split("_")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}
