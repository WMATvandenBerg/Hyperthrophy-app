import { useState } from "react";
import { BookOpen, PlusCircle, Search, X } from "lucide-react";
import { AppCard, PrimaryButton, SecondaryButton, TextInput } from "../components/ui";
import type { SmartCyclePreset } from "../lib/engine";
import type { AppSeedData } from "../types/models";

export function ProfileScreen({
  data,
  onCreateExercise,
  onStartNewMesocycle,
  onEndMesocycleEarly,
  smartPreset,
  onLogout,
}: {
  data: AppSeedData;
  onCreateExercise: (input: { name: string; muscle_group: string; equipment: string }) => Promise<void>;
  onStartNewMesocycle: () => void;
  onEndMesocycleEarly: (input: { reason: string; note?: string }) => Promise<void>;
  smartPreset: SmartCyclePreset;
  onLogout: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [stopReason, setStopReason] = useState("Recovery issues");
  const [stopNote, setStopNote] = useState("");
  const [stopping, setStopping] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState("Back");
  const [equipment, setEquipment] = useState("Cable");
  const stopReasons = [
    "Recovery issues",
    "Program too difficult",
    "Program too easy",
    "Pain / injury concerns",
    "Scheduling / time constraints",
    "Motivation / adherence drop",
    "Switching goal phase",
    "Other",
  ];
  const filteredExercises = data.exercises.filter((e) => {
    const q = libraryQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      e.name.toLowerCase().includes(q) ||
      e.muscle_group.toLowerCase().includes(q) ||
      e.equipment.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <AppCard className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-lime text-black font-semibold">A</div>
          <div>
            <p className="font-semibold">{data.user.first_name} Carter</p>
            <p className="text-xs text-zinc-400">{data.user.experience_level} • {data.user.preferred_units.toUpperCase()}</p>
          </div>
        </div>
      </AppCard>

      <AppCard>
        <p className="text-xs text-zinc-400">Current Program</p>
        <p className="mt-1 font-semibold">Week {data.program.current_week} of {data.program.mesocycle_length}</p>
        <p className="text-sm text-zinc-400">{data.program.days_per_week} days / week • MEV to MRV progression</p>
      </AppCard>

      <AppCard className="space-y-3">
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl bg-surface2 px-3 py-2 transition hover:border hover:border-lime/40"
        >
          <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-lime" /> Exercise Library</span>
          <span className="text-xs text-zinc-400">{data.exercises.length} total</span>
        </button>
        <PrimaryButton onClick={onStartNewMesocycle}>Start New Mesocycle (Smart)</PrimaryButton>
        <PrimaryButton onClick={() => setOpen(true)} className="flex items-center justify-center gap-2"><PlusCircle className="h-4 w-4" /> Create Custom Exercise</PrimaryButton>
        <button
          type="button"
          onClick={() => setStopOpen(true)}
          className="w-full rounded-full border border-amber-500/70 bg-amber-500/10 px-5 py-3 text-sm text-amber-200 transition hover:bg-amber-500/20"
        >
          End Mesocycle Early
        </button>
      </AppCard>

      <AppCard className="space-y-3">
        <p className="text-xs text-zinc-400">Next Mesocycle Suggestions</p>
        <p className="text-xs text-zinc-500">Adaptive mode: {smartPreset.smart_aggressiveness}</p>
        {smartPreset.suggestions.slice(0, 4).map((s) => (
          <div key={s.field} className="rounded-2xl bg-surface2 p-2">
            <p className="text-xs font-medium">{s.field}: {s.suggestion}</p>
            <p className="text-[11px] text-zinc-400">{s.rationale} ({s.confidence})</p>
          </div>
        ))}
      </AppCard>

      <AppCard className="space-y-2">
        <p className="text-xs text-zinc-400">Mesocycle History</p>
        {data.mesocycle_history.length ? (
          data.mesocycle_history.slice(0, 3).map((m) => (
            <div key={m.id} className="rounded-2xl bg-surface2 p-2 text-xs">
              <p>{new Date(m.created_at).toLocaleDateString()} • {Math.round(m.completion_rate * 100)}% completion</p>
              <p className="text-zinc-400">{m.notes}</p>
              <p className="text-zinc-500">Rep dropoff: {Math.round(m.avg_rep_dropoff * 100)}%</p>
              <p className="text-zinc-500">Suggestion acceptance: {Math.round(m.suggestion_acceptance_rate * 100)}% • Effectiveness: {Math.round(m.suggestion_effectiveness_score * 100)}%</p>
              <p className="text-zinc-500">Mode: {m.smart_aggressiveness}</p>
            </div>
          ))
        ) : (
          <p className="text-xs text-zinc-400">No completed mesocycles saved yet.</p>
        )}
      </AppCard>

      <button type="button" onClick={() => void onLogout()} className="w-full rounded-full border border-red-500/70 bg-red-500/10 px-5 py-3 text-red-300">Logout</button>

      {open && (
        <div className="fixed inset-0 z-40 grid place-items-end bg-black/60">
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-5">
            <h2 className="mb-3 text-lg font-semibold">Create Exercise</h2>
            <div className="space-y-2">
              <TextInput value={name} onChange={setName} placeholder="Exercise name" />
              <TextInput value={muscle} onChange={setMuscle} placeholder="Muscle group" />
              <TextInput value={equipment} onChange={setEquipment} placeholder="Equipment" />
            </div>
            <div className="mt-4 flex gap-2">
              <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
              <PrimaryButton
                onClick={async () => {
                  if (!name.trim()) return;
                  await onCreateExercise({ name, muscle_group: muscle, equipment });
                  setOpen(false);
                  setName("");
                }}
              >
                Save
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {libraryOpen && (
        <div className="fixed inset-0 z-40 grid place-items-end bg-black/60">
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Exercise Library</h2>
              <button type="button" onClick={() => setLibraryOpen(false)} className="rounded-full p-1 text-zinc-400 hover:bg-surface2 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
                placeholder="Search by name, muscle, equipment"
                className="w-full rounded-2xl border-2 border-white/10 bg-surface2 py-2 pl-9 pr-3 text-sm outline-none focus:border-lime"
              />
            </div>
            <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {filteredExercises.map((e) => (
                <div key={e.id} className="rounded-2xl bg-surface2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{e.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${e.is_system_exercise ? "bg-black/30 text-zinc-400" : "bg-lime/15 text-lime"}`}>
                      {e.is_system_exercise ? "System" : "Custom"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-400">{e.muscle_group} • {e.equipment}</p>
                </div>
              ))}
              {!filteredExercises.length && (
                <p className="rounded-2xl bg-surface2 p-3 text-xs text-zinc-400">No exercises found for this search.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {stopOpen && (
        <div className="fixed inset-0 z-40 grid place-items-end bg-black/60">
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">End Mesocycle Early</h2>
              <button type="button" onClick={() => setStopOpen(false)} className="rounded-full p-1 text-zinc-400 hover:bg-surface2 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-xs text-zinc-400">
              Choose a reason. This will be saved in mesocycle history and used for smarter next-cycle recommendations.
            </p>
            <div className="space-y-2">
              {stopReasons.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setStopReason(reason)}
                  className={`w-full rounded-2xl border px-3 py-2 text-left text-sm ${
                    stopReason === reason ? "border-lime bg-lime/10 text-lime" : "border-white/10 bg-surface2 text-zinc-300"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <textarea
              value={stopNote}
              onChange={(e) => setStopNote(e.target.value)}
              placeholder="Optional note (context for next cycle planning)"
              className="mt-3 h-24 w-full rounded-2xl border-2 border-white/10 bg-surface2 p-3 text-white outline-none focus:border-lime"
            />
            <div className="mt-4 flex gap-2">
              <SecondaryButton onClick={() => setStopOpen(false)}>Cancel</SecondaryButton>
              <PrimaryButton
                onClick={async () => {
                  if (!stopReason) return;
                  setStopping(true);
                  try {
                    await onEndMesocycleEarly({ reason: stopReason, note: stopNote.trim() || undefined });
                    setStopOpen(false);
                    setStopNote("");
                  } finally {
                    setStopping(false);
                  }
                }}
                className="bg-amber-400 text-black hover:bg-amber-300"
                disabled={stopping}
              >
                {stopping ? "Saving..." : "End & Use Data"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
