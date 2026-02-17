import { motion } from "framer-motion";
import { AlertTriangle, ChevronDown, ChevronUp, Timer, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppCard, NumberStepper, PrimaryButton, SecondaryButton, SelectChip } from "../components/ui";
import { getRpWeekTargetSets } from "../lib/engine";
import type { AppSeedData, ExerciseLog, LoggedSet } from "../types/models";

const MISSED_SET_REASONS = [
  { key: "load_too_heavy", label: "Load too heavy" },
  { key: "fatigue", label: "Fatigue / recovery" },
  { key: "time", label: "Time constraint" },
  { key: "pain", label: "Pain / discomfort" },
  { key: "technique", label: "Technique breakdown" },
  { key: "equipment", label: "Equipment unavailable" },
  { key: "other", label: "Other" },
] as const;

type MissedSetReason = (typeof MISSED_SET_REASONS)[number]["key"];

export function WorkoutScreen({
  data,
  onSaveExerciseLog,
  selectedDayId,
  onRebuildProgram,
  onFinishWorkout,
}: {
  data: AppSeedData;
  onSaveExerciseLog: (log: ExerciseLog) => Promise<unknown>;
  selectedDayId?: string | null;
  onRebuildProgram: () => void;
  onFinishWorkout?: () => void;
}) {
  const dayCards = useMemo(
    () =>
      data.training_days.map((d) => ({
        day: d,
        prescriptions: data.prescriptions.filter((p) => p.training_day_id === d.id),
      })),
    [data.prescriptions, data.training_days],
  );

  const firstWithWork = dayCards.find((x) => x.prescriptions.length > 0)?.day.id ?? dayCards[0]?.day.id ?? "";

  const [activeDayId, setActiveDayId] = useState(selectedDayId && dayCards.some((d) => d.day.id === selectedDayId) ? selectedDayId : firstWithWork);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(30);
  const [rir, setRir] = useState(2);
  const [restOpen, setRestOpen] = useState(false);
  const [doneCollapsed, setDoneCollapsed] = useState(true);
  const [doneSets, setDoneSets] = useState<LoggedSet[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const [underCompleteOpen, setUnderCompleteOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [missedReason, setMissedReason] = useState<MissedSetReason>("fatigue");
  const [missedSeverity, setMissedSeverity] = useState(3);
  const [missedNote, setMissedNote] = useState("");

  useEffect(() => {
    if (!activeDayId || !dayCards.some((d) => d.day.id === activeDayId)) {
      setActiveDayId(firstWithWork);
      setExerciseIndex(0);
      setDoneSets([]);
    }
  }, [activeDayId, dayCards, firstWithWork]);

  useEffect(() => {
    if (selectedDayId && dayCards.some((d) => d.day.id === selectedDayId)) {
      setActiveDayId(selectedDayId);
      setExerciseIndex(0);
      setDoneSets([]);
      setUnderCompleteOpen(false);
      setFinishOpen(false);
    }
  }, [dayCards, selectedDayId]);

  const selectedDay = dayCards.find((x) => x.day.id === activeDayId)?.day;
  const exercises = dayCards.find((x) => x.day.id === activeDayId)?.prescriptions ?? [];

  const current = exercises[exerciseIndex];
  const exercise = data.exercises.find((e) => e.id === current?.exercise_id);
  const progress = exercises.length ? ((exerciseIndex + 1) / exercises.length) * 100 : 0;

  const totalVolume = useMemo(() => doneSets.reduce((acc, set) => acc + set.reps * set.weight, 0), [doneSets]);
  const weekSetTarget = data.volumes.reduce(
    (acc, v) =>
      acc +
      getRpWeekTargetSets({
        mev: v.mev,
        mrv: v.mrv,
        currentWeek: data.program.current_week,
        mesocycleLength: data.program.mesocycle_length,
        deloadWeek: data.program.deload_week,
      }),
    0,
  );
  const daySetTarget = exercises.reduce((acc, p) => acc + getPrescriptionWeekSets(data, p.exercise_id, p.sets), 0);

  const currentModel = current?.progression_model ?? data.program.progression_model ?? "DoubleProgression";
  const hasNoProgrammedExercises = dayCards.every((x) => x.prescriptions.length === 0);
  const currentSetTarget = current ? getPrescriptionWeekSets(data, current.exercise_id, current.sets) : 0;

  const repRange = parseRepRange(current?.target_reps ?? "8-12");
  const overRepSets = doneSets.filter((s) => s.reps > repRange.max).length;
  const overRepFlag = overRepSets >= 2;
  const canLogSet = current ? doneSets.length < currentSetTarget : false;
  const missedSets = current ? Math.max(0, currentSetTarget - doneSets.length) : 0;

  useEffect(() => {
    if (!exercise || !current) return;
    const rec = getLatestLoadRecommendation(data, exercise.id);
    if (rec) {
      setWeight(rec);
    } else {
      setWeight(current.target_load || 30);
    }
    setDoneSets([]);
  }, [current?.id, exercise?.id]);

  if (!selectedDay) {
    return (
      <AppCard className="space-y-2">
        <p>No training days available.</p>
        <PrimaryButton onClick={onRebuildProgram}>Build Program</PrimaryButton>
      </AppCard>
    );
  }

  if (hasNoProgrammedExercises) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Workouts</h1>
        <AppCard className="space-y-2">
          <p className="font-semibold">No programmed exercises found</p>
          <p className="text-xs text-zinc-400">
            Your current training days do not have prescriptions yet. Rebuild your mesocycle so sets are allocated to exercises.
          </p>
          <PrimaryButton onClick={onRebuildProgram}>Rebuild Program</PrimaryButton>
        </AppCard>
      </div>
    );
  }

  const saveCurrentLog = async (opts?: { reason?: MissedSetReason; severity?: number; note?: string }) => {
    if (!current || !exercise) return;
    setSaveState("saving");

    const recommendation = computeNextLoadRecommendation(exercise.muscle_group, doneSets, repRange.max);

    await onSaveExerciseLog({
      id: `l${Date.now()}`,
      exercise_prescription_id: current.id,
      exercise_id: exercise.id,
      sets_completed: doneSets,
      total_volume_kg: totalVolume,
      performance_rating: Math.max(1, Math.min(10, Math.round(avg(doneSets.map((s) => 10 - s.rir))))),
      prescribed_sets: currentSetTarget,
      sets_completed_count: doneSets.length,
      unused_sets: Math.max(0, currentSetTarget - doneSets.length),
      unused_set_reason: opts?.reason,
      unused_set_severity: opts?.severity,
      unused_set_note: opts?.note,
      rep_target_min: repRange.min,
      rep_target_max: repRange.max,
      over_rep_flag: overRepFlag,
      next_load_recommendation: recommendation,
    });

    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 1200);
  };

  const moveToNextExercise = () => {
    setExerciseIndex((v) => Math.min(exercises.length - 1, v + 1));
    setDoneSets([]);
    setMissedNote("");
    setMissedSeverity(3);
    setMissedReason("fatigue");
  };

  const handleNext = async () => {
    if (!current) return;
    if (doneSets.length < currentSetTarget) {
      setUnderCompleteOpen(true);
      return;
    }
    await saveCurrentLog();
    if (exerciseIndex >= exercises.length - 1) {
      setFinishOpen(true);
      return;
    }
    moveToNextExercise();
  };

  const submitUnderCompletion = async () => {
    await saveCurrentLog({ reason: missedReason, severity: missedSeverity, note: missedNote });
    setUnderCompleteOpen(false);
    if (exerciseIndex >= exercises.length - 1) {
      setFinishOpen(true);
      return;
    }
    moveToNextExercise();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Workouts</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {dayCards.map(({ day, prescriptions }) => (
          <button
            key={day.id}
            type="button"
            onClick={() => {
              setActiveDayId(day.id);
              setExerciseIndex(0);
              setDoneSets([]);
              setUnderCompleteOpen(false);
              setFinishOpen(false);
            }}
            className={`rounded-full border px-3 py-1 text-xs whitespace-nowrap ${
              day.id === activeDayId ? "border-lime bg-lime/10 text-lime" : "border-white/15 bg-surface text-zinc-300"
            }`}
          >
            D{day.day_number} {day.name} ({prescriptions.length})
          </button>
        ))}
      </div>

      <AppCard className="space-y-2">
        <p className="text-xs text-zinc-400">RP Session Strategy</p>
        <p className="text-sm">
          Model: <span className="font-semibold text-lime">{currentModel}</span> • Day target: <span className="font-semibold">{daySetTarget} sets</span>
        </p>
        <p className="text-xs text-zinc-400">
          Week {data.program.current_week}/{data.program.mesocycle_length} target across muscles: {weekSetTarget} sets. Drive overload, keep set quality high, avoid RIR below {Math.max(0, current?.target_rir ?? 1)} too early.
        </p>
      </AppCard>

      {(!current || !exercise) && (
        <AppCard className="space-y-2">
          <p className="font-semibold">No exercises on this day yet</p>
          <p className="text-xs text-zinc-400">Your program exists. This selected day has 0 prescriptions. Pick another day above with entries.</p>
        </AppCard>
      )}

      {current && exercise && (
        <>
          <h2 className="text-xl font-semibold">{selectedDay.name}</h2>

          <div className="h-2 rounded-full bg-surface2">
            <div className="h-2 rounded-full bg-lime" style={{ width: `${progress}%` }} />
          </div>

          <AppCard className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-400">Exercise {exerciseIndex + 1} / {exercises.length}</p>
              <p className="text-xs text-zinc-300">Sets: <span className="text-lime">{doneSets.length}</span> / {currentSetTarget}</p>
            </div>
            <p className="text-xl font-semibold">{exercise.name}</p>
            <p className="text-sm text-zinc-400">{currentSetTarget} sets • {current.target_reps} reps • Target RIR {current.target_rir}</p>
            <p className="text-xs text-zinc-400">{current.progression_reason}</p>
          </AppCard>

          <AppCard className="space-y-2">
            <p className="text-xs text-zinc-400">Execution block ({currentModel})</p>
            <p className="text-sm">
              {currentModel === "TopSetBackoff" && "Top set near RIR target, then backoff sets -8-12% load."}
              {currentModel === "RepGoal" && "Keep load fixed until total rep goal is met, then increase load."}
              {currentModel === "DoubleProgression" && "Hit top of rep range across sets, then increase load next week."}
            </p>
          </AppCard>

          <div className="grid gap-3">
            <NumberStepper label="Reps" value={reps} onChange={setReps} allowTyped />
            <NumberStepper label="Weight (kg)" value={weight} onChange={setWeight} step={2.5} allowTyped />
          </div>

          <AppCard>
            <p className="mb-2 text-xs text-zinc-400">RIR</p>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRir(r)}
                  className={`rounded-full border px-3 py-2 text-sm ${rir === r ? "border-lime bg-lime/10" : "border-white/10 bg-surface2"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </AppCard>

          <div className="flex gap-3">
            <SecondaryButton onClick={() => setRestOpen(true)}>Start Rest Timer</SecondaryButton>
            <PrimaryButton
              onClick={() =>
                setDoneSets((s) => (canLogSet ? [...s, { reps, weight, rir, completed_at: new Date().toISOString() }] : s))
              }
              disabled={!canLogSet}
            >
              {canLogSet ? "Log Set" : "All programmed sets completed"}
            </PrimaryButton>
          </div>

          {missedSets > 0 && (
            <AppCard className="border border-amber-400/40 bg-amber-200/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
                <p className="text-xs text-amber-200">
                  You still have {missedSets} programmed set{missedSets > 1 ? "s" : ""} remaining. If you continue, you must provide a reason for review.
                </p>
              </div>
            </AppCard>
          )}

          {overRepFlag && (
            <AppCard className="border border-lime/40 bg-lime/5">
              <p className="text-xs text-lime">
                You exceeded the top rep target on multiple sets. Load recommendation is prepared for your next session of this exercise.
              </p>
            </AppCard>
          )}

          <AppCard className="space-y-2">
            <button type="button" onClick={() => setDoneCollapsed((v) => !v)} className="flex w-full items-center justify-between">
              <p className="text-sm">Completed Sets ({doneSets.length})</p>
              {doneCollapsed ? <ChevronDown className="h-4 w-4 text-lime" /> : <ChevronUp className="h-4 w-4 text-lime" />}
            </button>
            {!doneCollapsed && (
              <div className="space-y-2">
                {doneSets.map((set, idx) => (
                  <div key={`${set.completed_at}-${idx}`} className="flex items-center justify-between gap-2 rounded-2xl bg-surface2 p-2 text-xs text-zinc-300">
                    <span>Set {idx + 1}: {set.reps} reps x {set.weight}kg @ RIR {set.rir}</span>
                    <button
                      type="button"
                      onClick={() => setDoneSets((s) => s.filter((_, i) => i !== idx))}
                      className="rounded-full p-1 text-zinc-400 transition hover:bg-black/30 hover:text-red-300"
                      aria-label={`Delete set ${idx + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <p className="text-xs text-zinc-400">Total volume: {totalVolume} kg</p>
              </div>
            )}
          </AppCard>

          <AppCard className="space-y-1">
            <p className="text-xs text-zinc-400">Execution Quality</p>
            <p className="text-sm">Set completion: {doneSets.length}/{currentSetTarget}</p>
            <p className="text-sm">Rep adherence: {repAdherencePercent(doneSets, repRange.min, repRange.max)}%</p>
            <p className="text-sm">Load appropriateness: {loadAppropriateness(doneSets, repRange.min, repRange.max)}</p>
            <p className="text-sm">Next action: {nextAction(doneSets, currentSetTarget, repRange.max)}</p>
          </AppCard>

          <div className="grid grid-cols-2 gap-3 pb-2">
            <SecondaryButton
              onClick={() => {
                setExerciseIndex((v) => Math.max(0, v - 1));
                setDoneSets([]);
              }}
            >
              Previous
            </SecondaryButton>
            <PrimaryButton onClick={handleNext} disabled={saveState === "saving"}>
              {saveState === "saving" ? "Saving..." : exerciseIndex >= exercises.length - 1 ? "Finish Workout" : "Next"}
            </PrimaryButton>
          </div>
        </>
      )}

      {underCompleteOpen && current && (
        <div className="fixed inset-0 z-40 grid place-items-end bg-black/60">
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-5">
            <h3 className="mb-1 text-lg font-semibold">Programmed sets not completed</h3>
            <p className="mb-3 text-sm text-zinc-400">
              You completed {doneSets.length}/{currentSetTarget} sets. Please add a reason to help review and adjust your plan quality.
            </p>

            <div className="space-y-2">
              {MISSED_SET_REASONS.map((r) => (
                <SelectChip key={r.key} label={r.label} selected={missedReason === r.key} onClick={() => setMissedReason(r.key)} />
              ))}
            </div>

            <div className="mt-3">
              <NumberStepper label="Severity (1-5)" value={missedSeverity} onChange={(v) => setMissedSeverity(Math.max(1, Math.min(5, Math.round(v))))} />
            </div>

            <textarea
              value={missedNote}
              onChange={(e) => setMissedNote(e.target.value)}
              placeholder="Optional note (what happened?)"
              className="mt-3 h-24 w-full rounded-2xl border-2 border-white/10 bg-surface2 p-3 text-white outline-none focus:border-lime"
            />

            <div className="mt-4 flex gap-2">
              <SecondaryButton onClick={() => setUnderCompleteOpen(false)}>Back</SecondaryButton>
              <PrimaryButton onClick={submitUnderCompletion}>
                {exerciseIndex >= exercises.length - 1 ? "Save & Finish" : "Save & Continue"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {finishOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 grid place-items-end bg-black/60">
          <motion.div initial={{ y: 220 }} animate={{ y: 0 }} className="w-full max-w-md rounded-t-3xl bg-surface p-6">
            <h3 className="text-lg font-semibold">Workout completed</h3>
            <p className="mt-1 text-sm text-zinc-400">
              All exercises for {selectedDay.name} are logged. You can return to dashboard or stay in workouts.
            </p>
            <div className="mt-4 flex gap-2">
              <SecondaryButton onClick={() => setFinishOpen(false)}>Stay Here</SecondaryButton>
              <PrimaryButton
                onClick={() => {
                  setFinishOpen(false);
                  setExerciseIndex(0);
                  setDoneSets([]);
                  onFinishWorkout?.();
                }}
              >
                Done
              </PrimaryButton>
            </div>
          </motion.div>
        </motion.div>
      )}

      {restOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-30 grid place-items-end bg-black/60">
          <motion.div initial={{ y: 220 }} animate={{ y: 0 }} className="w-full max-w-md rounded-t-3xl bg-surface p-6">
            <div className="mb-3 flex items-center gap-2 text-lime"><Timer className="h-5 w-5" /> Rest Timer</div>
            <p className="mb-4 text-4xl font-semibold">01:30</p>
            <PrimaryButton onClick={() => setRestOpen(false)}>Close</PrimaryButton>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function parseRepRange(raw: string) {
  const match = raw.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (!match) return { min: 8, max: 12 };
  return { min: Number(match[1]), max: Number(match[2]) };
}

function repAdherencePercent(sets: LoggedSet[], min: number, max: number) {
  if (!sets.length) return 0;
  const inRange = sets.filter((s) => s.reps >= min && s.reps <= max).length;
  return Math.round((inRange / sets.length) * 100);
}

function loadAppropriateness(sets: LoggedSet[], min: number, max: number) {
  if (!sets.length) return "Unknown";
  const above = sets.filter((s) => s.reps > max).length;
  const below = sets.filter((s) => s.reps < min).length;
  if (above >= 2) return "Low";
  if (below >= 2) return "High";
  return "Good";
}

function nextAction(sets: LoggedSet[], prescribedSets: number, maxRep: number) {
  if (sets.length < prescribedSets) return "Review volume/load";
  if (sets.filter((s) => s.reps > maxRep).length >= 2) return "Increase load next week";
  return "Hold load, progress reps";
}

function computeNextLoadRecommendation(muscleGroup: string, sets: LoggedSet[], maxRep: number) {
  const above = sets.filter((s) => s.reps > maxRep).length;
  if (above < 2 || !sets.length) return undefined;
  const avgLoad = avg(sets.map((s) => s.weight));
  const lowerBody = ["Quads", "Hamstrings", "Glutes", "Calves"];
  const inc = lowerBody.includes(muscleGroup) ? 5 : 2.5;
  return roundToStep(avgLoad + inc, 2.5);
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function getLatestLoadRecommendation(data: AppSeedData, exerciseId: string) {
  const ordered = [...data.logs].sort(
    (a, b) => +new Date(b.sets_completed[0]?.completed_at ?? 0) - +new Date(a.sets_completed[0]?.completed_at ?? 0),
  );
  const found = ordered.find((l) => l.exercise_id === exerciseId && l.next_load_recommendation);
  return found?.next_load_recommendation;
}

function getPrescriptionWeekSets(data: AppSeedData, exerciseId: string, baseSets: number) {
  const exercise = data.exercises.find((e) => e.id === exerciseId);
  if (!exercise) return baseSets;
  const muscle = data.volumes.find((v) => v.muscle_group === exercise.muscle_group);
  if (!muscle) return baseSets;

  const weekTarget = getRpWeekTargetSets({
    mev: muscle.mev,
    mrv: muscle.mrv,
    currentWeek: data.program.current_week,
    mesocycleLength: data.program.mesocycle_length,
    deloadWeek: data.program.deload_week,
  });
  const baselineMuscleSets = Math.max(1, muscle.current_volume);
  const scaled = Math.round(baseSets * (weekTarget / baselineMuscleSets));
  return Math.max(1, scaled);
}
