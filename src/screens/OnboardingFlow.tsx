import { AnimatePresence, motion } from "framer-motion";
import { Brain, ChevronDown, ChevronUp, Dumbbell, LayoutTemplate, Settings2, Target, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { UIEvent } from "react";
import {
  AppCard,
  NumberStepper,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  SelectChip,
} from "../components/ui";
import type { SmartCyclePreset } from "../lib/engine";
import { evenlyAllocateSets } from "../lib/programBuilder";
import type {
  EmphasisLevel,
  Exercise,
  ExerciseAllocationInput,
  ExperienceLevel,
  ProgramSetupInput,
  ProgressionModel,
  SuggestionDecision,
  SplitPreference,
} from "../types/models";

type MuscleState = {
  muscle_group: string;
  emphasis: EmphasisLevel;
  mev: number;
  mrv: number;
  target_sets: number;
};

const EXERCISE_PAGE_SIZE = 14;

export function OnboardingFlow({
  onComplete,
  exercises,
  onCreateExercise,
  mode = "onboarding",
  smartPreset,
  baselineSetup,
  onCancel,
}: {
  onComplete: (setup: ProgramSetupInput) => Promise<unknown> | unknown;
  exercises: Exercise[];
  onCreateExercise: (input: { name: string; muscle_group: string; equipment: string }) => Promise<unknown>;
  mode?: "onboarding" | "new_cycle";
  smartPreset?: SmartCyclePreset | null;
  baselineSetup?: ProgramSetupInput | null;
  onCancel?: () => void;
}) {
  const initialSetup = smartPreset?.setup;
  const initialMuscles = (initialSetup?.muscle_setups as MuscleState[] | undefined) ?? buildDefaultMuscles("Intermediate");
  const initialSelectionByMuscle = (initialSetup?.exercise_allocations ?? []).reduce<Record<string, string[]>>((acc, a) => {
    acc[a.muscle_group] = [...(acc[a.muscle_group] ?? []), a.exercise_id];
    return acc;
  }, {});
  const initialAllocations = (initialSetup?.exercise_allocations ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[`${a.muscle_group}::${a.exercise_id}`] = a.weekly_sets;
    return acc;
  }, {});

  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState<ExperienceLevel>(initialSetup?.experience_level ?? "Intermediate");
  const [daysPerWeek, setDaysPerWeek] = useState(initialSetup?.days_per_week ?? 5);
  const [mesoLength, setMesoLength] = useState(initialSetup?.mesocycle_length ?? 6);
  const [splitPreference, setSplitPreference] = useState<SplitPreference>(initialSetup?.split_preference ?? "Auto");
  const [localExercises, setLocalExercises] = useState<Exercise[]>(exercises);

  const [muscles, setMuscles] = useState<MuscleState[]>(() => initialMuscles);
  const [activeMuscle, setActiveMuscle] = useState(muscles[0]?.muscle_group ?? "Chest");

  const [selectedByMuscle, setSelectedByMuscle] = useState<Record<string, string[]>>(initialSelectionByMuscle);
  const [setAllocations, setSetAllocations] = useState<Record<string, number>>(initialAllocations);
  const [allocationSearch, setAllocationSearch] = useState("");
  const [visibleExerciseCount, setVisibleExerciseCount] = useState(EXERCISE_PAGE_SIZE);
  const [customExerciseOpen, setCustomExerciseOpen] = useState(false);
  const [exerciseModelOverrides, setExerciseModelOverrides] = useState<Record<string, ProgressionModel>>(
    initialSetup?.exercise_model_overrides ?? {},
  );
  const [suggestionDecisions, setSuggestionDecisions] = useState<Record<string, SuggestionDecision>>(
    () =>
      Object.fromEntries(
        (smartPreset?.suggestions ?? []).map((s) => [
          s.field,
          {
            field: s.field,
            accepted: true,
            suggested_value: s.suggestion,
            applied_value: s.suggestion,
          } satisfies SuggestionDecision,
        ]),
      ),
  );
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseEquipment, setNewExerciseEquipment] = useState("Machine");
  const [creatingExercise, setCreatingExercise] = useState(false);

  const [progressionModel, setProgressionModel] = useState<ProgressionModel>(initialSetup?.pro_settings.progression_model ?? "DoubleProgression");
  const [fatigueSensitivity, setFatigueSensitivity] = useState<"Low" | "Moderate" | "High">(initialSetup?.pro_settings.fatigue_sensitivity ?? "Moderate");
  const [rirFloor, setRirFloor] = useState(initialSetup?.pro_settings.rir_floor ?? 1);
  const [useMyoreps, setUseMyoreps] = useState(initialSetup?.pro_settings.use_myoreps ?? false);
  const [deloadMode, setDeloadMode] = useState<"Auto" | "Manual">(initialSetup?.pro_settings.deload_mode ?? "Auto");
  const [deloadWeek, setDeloadWeek] = useState(initialSetup?.pro_settings.deload_week ?? (initialSetup?.mesocycle_length ?? 6));
  const [painProtocol, setPainProtocol] = useState<"Conservative" | "Moderate" | "Aggressive">(initialSetup?.pro_settings.pain_protocol ?? "Moderate");

  const steps = [
    "Cycle Constraints",
    "Volume Setup Per Muscle",
    "Exercise Set Allocation",
    "Split Logic",
    "Pro Settings",
    "Review & Create",
  ];

  const activeMuscleExercises = useMemo(() => {
    const q = allocationSearch.trim().toLowerCase();
    return localExercises
      .filter((e) => e.muscle_group === activeMuscle)
      .filter((e) => {
        if (!q) return true;
        return e.name.toLowerCase().includes(q) || e.equipment.toLowerCase().includes(q);
      });
  }, [activeMuscle, allocationSearch, localExercises]);
  const visibleExercises = useMemo(
    () => activeMuscleExercises.slice(0, visibleExerciseCount),
    [activeMuscleExercises, visibleExerciseCount],
  );
  const hasMoreExercises = visibleExerciseCount < activeMuscleExercises.length;

  const volumeTotal = muscles.reduce((acc, m) => acc + m.target_sets, 0);

  useEffect(() => {
    setVisibleExerciseCount(EXERCISE_PAGE_SIZE);
  }, [activeMuscle, allocationSearch]);

  const allocations = useMemo<ExerciseAllocationInput[]>(
    () =>
      Object.entries(setAllocations)
        .filter(([, sets]) => sets > 0)
        .map(([key, weekly_sets]) => {
          const [muscle_group, exercise_id] = key.split("::");
          return { muscle_group, exercise_id, weekly_sets };
        }),
    [setAllocations],
  );

  const canContinue = useMemo(() => {
    if (step === 2) return allocations.length > 0;
    return true;
  }, [allocations.length, step]);

  const applySuggestionDecision = (field: string, accepted: boolean, suggestionValue: string) => {
    const getBaselineMuscleSets = (muscle: string) =>
      baselineSetup?.muscle_setups.find((m) => m.muscle_group === muscle)?.target_sets;
    const getSuggestionMuscleSets = (muscle: string) =>
      smartPreset?.setup.muscle_setups.find((m) => m.muscle_group === muscle)?.target_sets;

    if (field.startsWith("muscle.") && field.endsWith(".target_sets")) {
      const muscle = field.split(".")[1];
      const nextSets = accepted ? getSuggestionMuscleSets(muscle) : getBaselineMuscleSets(muscle);
      if (typeof nextSets === "number") {
        updateMuscle(muscle, (prev) => ({ ...prev, target_sets: nextSets }));
      }
    }
    if (field === "program.days_per_week") {
      const v = accepted
        ? Number(suggestionValue.replace(/[^\d]/g, "")) || daysPerWeek
        : baselineSetup?.days_per_week ?? daysPerWeek;
      setDaysPerWeek(v);
    }
    if (field === "program.mesocycle_length") {
      const v = accepted
        ? Number(suggestionValue.replace(/[^\d]/g, "")) || mesoLength
        : baselineSetup?.mesocycle_length ?? mesoLength;
      setMesoLength(v);
    }
    if (field === "pro.progression_model") {
      const v = accepted
        ? (suggestionValue as ProgressionModel)
        : baselineSetup?.pro_settings.progression_model ?? progressionModel;
      setProgressionModel(v);
    }
    if (field === "pro.deload_week") {
      const v = accepted
        ? Number(suggestionValue.replace(/[^\d]/g, "")) || deloadWeek
        : baselineSetup?.pro_settings.deload_week ?? deloadWeek;
      setDeloadWeek(v);
    }
  };

  const applyExperiencePreset = (level: ExperienceLevel) => {
    setExperience(level);
    const next = buildDefaultMuscles(level);
    setMuscles(next);
    setActiveMuscle(next[0].muscle_group);
  };

  const toggleExercise = (muscleGroup: string, exerciseId: string) => {
    const current = selectedByMuscle[muscleGroup] ?? [];
    const exists = current.includes(exerciseId);
    const next = exists ? current.filter((id) => id !== exerciseId) : [...current, exerciseId];
    setSelectedByMuscle((s) => ({ ...s, [muscleGroup]: next }));

    if (exists) {
      setSetAllocations((s) => {
        const copy = { ...s };
        delete copy[`${muscleGroup}::${exerciseId}`];
        return copy;
      });
    }
  };

  const autoDistributeForMuscle = (muscleGroup: string) => {
    const target = muscles.find((m) => m.muscle_group === muscleGroup)?.target_sets ?? 0;
    const selected = selectedByMuscle[muscleGroup] ?? [];
    const dist = evenlyAllocateSets(target, selected);
    setSetAllocations((s) => {
      const next = { ...s };
      Object.entries(dist).forEach(([exerciseId, sets]) => {
        next[`${muscleGroup}::${exerciseId}`] = sets;
      });
      return next;
    });
  };

  const updateMuscle = (muscleGroup: string, updater: (m: MuscleState) => MuscleState) => {
    setMuscles((prev) => prev.map((m) => (m.muscle_group === muscleGroup ? updater(m) : m)));
  };

  const submitSetup = () => {
    onComplete({
      experience_level: experience,
      days_per_week: daysPerWeek,
      mesocycle_length: mesoLength,
      split_preference: splitPreference,
      muscle_setups: muscles,
      exercise_allocations: allocations,
      exercise_model_overrides: exerciseModelOverrides,
      suggestion_decisions: Object.values(suggestionDecisions),
      smart_aggressiveness: smartPreset?.smart_aggressiveness ?? "Balanced",
      pro_settings: {
        progression_model: progressionModel,
        fatigue_sensitivity: fatigueSensitivity,
        rir_floor: rirFloor,
        use_myoreps: useMyoreps,
        deload_mode: deloadMode,
        deload_week: Math.max(1, Math.min(mesoLength, deloadWeek)),
        pain_protocol: painProtocol,
      },
    });
  };

  const addExerciseInAllocation = async () => {
    if (!newExerciseName.trim()) return;
    setCreatingExercise(true);
    const created = await onCreateExercise({
      name: newExerciseName.trim(),
      muscle_group: activeMuscle,
      equipment: newExerciseEquipment,
    });
    const id = (created as Exercise | undefined)?.id;
    if (id) {
      setLocalExercises((prev) => [
        { id, name: newExerciseName.trim(), muscle_group: activeMuscle, equipment: newExerciseEquipment, is_system_exercise: false },
        ...prev,
      ]);
      setSelectedByMuscle((s) => ({
        ...s,
        [activeMuscle]: [...(s[activeMuscle] ?? []), id],
      }));
    }
    setNewExerciseName("");
    setCreatingExercise(false);
  };

  const handleExerciseListScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 32;
    if (!nearBottom || !hasMoreExercises) return;
    setVisibleExerciseCount((prev) => Math.min(activeMuscleExercises.length, prev + EXERCISE_PAGE_SIZE));
  };

  return (
    <ScreenContainer hideNav>
      <div className="pb-28">
        {mode === "new_cycle" && onCancel && (
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-white/20 bg-surface2 px-3 py-1 text-xs text-zinc-300 hover:border-lime hover:text-lime"
            >
              <span className="inline-flex items-center gap-1"><X className="h-3.5 w-3.5" /> Cancel</span>
            </button>
          </div>
        )}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-zinc-400">Step {step + 1} of {steps.length}</p>
          <div className="h-2 w-44 rounded-full bg-surface2">
            <div className="h-2 rounded-full bg-lime transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-semibold">{steps[step]}</h1>
        <p className="mb-4 text-sm text-zinc-400">
          Guided Hybrid Builder: volume first, then exercise allocation, then split generation with pro controls.
        </p>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
          {step === 0 && (
            <>
              {smartPreset && mode === "new_cycle" && (
                <AppCard className="space-y-3 border border-lime/30 bg-lime/5">
                  <p className="text-sm font-semibold text-lime">
                    Smart Next-Mesocycle Presets Applied ({smartPreset.smart_aggressiveness})
                  </p>
                  <p className="text-xs text-zinc-300">
                    These defaults were generated from execution quality, rep outcomes, set completion, fatigue trends, and prior cycle behavior.
                    You can edit everything.
                  </p>
                  <div className="space-y-2">
                    {smartPreset.suggestions.slice(0, 8).map((s) => (
                      <div key={s.field} className="rounded-xl bg-surface2 p-2 text-xs">
                        <p className="font-medium">{s.field}: {s.suggestion} <span className="text-zinc-400">({s.confidence})</span></p>
                        <p className="text-zinc-400">{s.rationale}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <SelectChip
                            label="Accept"
                            selected={suggestionDecisions[s.field]?.accepted !== false}
                            onClick={() =>
                              setSuggestionDecisions((prev) => ({
                                ...prev,
                                [s.field]: {
                                  field: s.field,
                                  accepted: true,
                                  suggested_value: s.suggestion,
                                  applied_value: s.suggestion,
                                },
                              }))
                            }
                          />
                          <SelectChip
                            label="Reject"
                            selected={suggestionDecisions[s.field]?.accepted === false}
                            onClick={() =>
                              setSuggestionDecisions((prev) => ({
                                ...prev,
                                [s.field]: {
                                  field: s.field,
                                  accepted: false,
                                  suggested_value: s.suggestion,
                                  applied_value: undefined,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="mt-1 flex gap-2">
                          <button
                            type="button"
                            className="text-[11px] text-lime underline"
                            onClick={() => applySuggestionDecision(s.field, true, s.suggestion)}
                          >
                            Apply suggestion
                          </button>
                          <button
                            type="button"
                            className="text-[11px] text-zinc-400 underline"
                            onClick={() => applySuggestionDecision(s.field, false, s.suggestion)}
                          >
                            Revert baseline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AppCard>
              )}

              <AppCard className="space-y-3">
                <div className="mb-1 flex items-center gap-2 text-lime"><Target className="h-4 w-4" /> Experience Preset</div>
                <div className="grid grid-cols-3 gap-2">
                  {(["Beginner", "Intermediate", "Advanced"] as ExperienceLevel[]).map((x) => (
                    <SelectChip key={x} label={x} selected={experience === x} onClick={() => applyExperiencePreset(x)} />
                  ))}
                </div>
              </AppCard>

              <AppCard className="space-y-3">
                <div className="grid gap-3">
                  <NumberStepper label="Training days/week" value={daysPerWeek} onChange={(v) => setDaysPerWeek(Math.max(3, Math.min(6, Math.round(v))))} />
                  <NumberStepper label="Mesocycle length (weeks)" value={mesoLength} onChange={(v) => setMesoLength(Math.max(4, Math.min(8, Math.round(v))))} />
                </div>
              </AppCard>
            </>
          )}

          {step === 1 && (
            <>
              <AppCard className="space-y-2">
                <p className="text-sm text-zinc-300">Set target volume lane per muscle (MEV to MRV).</p>
                <p className="text-xs text-zinc-400">Weekly total target sets: {volumeTotal}</p>
              </AppCard>

              {muscles.map((m) => (
                <AppCard key={m.muscle_group} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{m.muscle_group}</p>
                    <span className="text-xs text-zinc-400">MEV {m.mev} / MRV {m.mrv}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(["Maintain", "Grow", "Emphasize"] as EmphasisLevel[]).map((e) => (
                      <SelectChip
                        key={e}
                        label={e}
                        selected={m.emphasis === e}
                        onClick={() =>
                          updateMuscle(m.muscle_group, (prev) => ({
                            ...prev,
                            emphasis: e,
                            target_sets: targetSetsFromEmphasis(e, prev.mev, prev.mrv),
                          }))
                        }
                      />
                    ))}
                  </div>

                  <NumberStepper
                    label="Target weekly sets"
                    value={m.target_sets}
                    onChange={(v) =>
                      updateMuscle(m.muscle_group, (prev) => ({
                        ...prev,
                        target_sets: Math.max(prev.mev - 2, Math.min(prev.mrv, Math.round(v))),
                      }))
                    }
                    allowTyped
                  />
                </AppCard>
              ))}
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {muscles.map((m) => (
                  <button
                    key={m.muscle_group}
                    type="button"
                    onClick={() => setActiveMuscle(m.muscle_group)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      activeMuscle === m.muscle_group ? "border-lime bg-lime/10" : "border-white/15 bg-surface"
                    }`}
                  >
                    {m.muscle_group}
                  </button>
                ))}
              </div>

              <AppCard className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{activeMuscle} exercise pool</p>
                  <button className="text-xs text-lime" type="button" onClick={() => autoDistributeForMuscle(activeMuscle)}>
                    Auto distribute sets
                  </button>
                </div>
                <p className="text-xs text-zinc-400">
                  Target: {muscles.find((m) => m.muscle_group === activeMuscle)?.target_sets ?? 0} weekly sets
                </p>

                <div className="rounded-2xl border border-white/10 bg-appbg p-3">
                  <button
                    type="button"
                    onClick={() => setCustomExerciseOpen((v) => !v)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <p className="text-xs text-zinc-400">Add custom exercise for {activeMuscle}</p>
                    {customExerciseOpen ? <ChevronUp className="h-4 w-4 text-lime" /> : <ChevronDown className="h-4 w-4 text-lime" />}
                  </button>
                  {customExerciseOpen && (
                    <div className="mt-2">
                      <input
                        value={newExerciseName}
                        onChange={(e) => setNewExerciseName(e.target.value)}
                        placeholder="Exercise name"
                        className="mb-2 w-full rounded-xl border border-white/10 bg-surface2 px-3 py-2 text-sm outline-none focus:border-lime"
                      />
                      <input
                        value={newExerciseEquipment}
                        onChange={(e) => setNewExerciseEquipment(e.target.value)}
                        placeholder="Equipment"
                        className="mb-2 w-full rounded-xl border border-white/10 bg-surface2 px-3 py-2 text-sm outline-none focus:border-lime"
                      />
                      <PrimaryButton onClick={addExerciseInAllocation} disabled={creatingExercise}>
                        {creatingExercise ? "Adding..." : "Add Exercise"}
                      </PrimaryButton>
                    </div>
                  )}
                </div>

                <input
                  value={allocationSearch}
                  onChange={(e) => setAllocationSearch(e.target.value)}
                  placeholder={`Search ${activeMuscle} exercises`}
                  className="w-full rounded-xl border border-white/10 bg-surface2 px-3 py-2 text-sm outline-none focus:border-lime"
                />

                <div className="rounded-2xl border border-white/10 bg-appbg p-2">
                  <p className="mb-2 px-1 text-xs text-zinc-400">
                    Showing {Math.min(visibleExercises.length, activeMuscleExercises.length)} of {activeMuscleExercises.length}
                  </p>
                  <div className="max-h-[48vh] space-y-2 overflow-y-auto pr-1" onScroll={handleExerciseListScroll}>
                    {visibleExercises.map((e) => {
                      const selected = (selectedByMuscle[activeMuscle] ?? []).includes(e.id);
                      const allocKey = `${activeMuscle}::${e.id}`;
                      return (
                        <div
                          key={e.id}
                          className="cursor-pointer rounded-2xl bg-surface2 p-3 transition hover:border hover:border-lime/40"
                          onClick={() => toggleExercise(activeMuscle, e.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(evt) => {
                            if (evt.key === "Enter" || evt.key === " ") {
                              evt.preventDefault();
                              toggleExercise(activeMuscle, e.id);
                            }
                          }}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="text-left">
                              <p className="text-sm font-medium">{e.name}</p>
                              <p className="text-xs text-zinc-400">{e.equipment}</p>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-xs ${selected ? "bg-lime/20 text-lime" : "bg-black/30 text-zinc-400"}`}>
                              {selected ? "Selected" : "Off"}
                            </span>
                          </div>
                          {selected && (
                            <div className="space-y-2" onClick={(evt) => evt.stopPropagation()}>
                              <NumberStepper
                                label="Weekly sets for this exercise"
                                value={setAllocations[allocKey] ?? 0}
                                onChange={(v) => setSetAllocations((s) => ({ ...s, [allocKey]: Math.max(0, Math.round(v)) }))}
                                allowTyped
                              />
                              <p className="text-xs text-zinc-400">Progression model</p>
                              <div className="grid grid-cols-3 gap-2">
                                {(["DoubleProgression", "TopSetBackoff", "RepGoal"] as ProgressionModel[]).map((m) => (
                                  <SelectChip
                                    key={m}
                                    label={m === "DoubleProgression" ? "Double" : m === "TopSetBackoff" ? "Top+Backoff" : "RepGoal"}
                                    selected={(exerciseModelOverrides[e.id] ?? progressionModel) === m}
                                    onClick={() =>
                                      setExerciseModelOverrides((prev) => ({
                                        ...prev,
                                        [e.id]: m,
                                      }))
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!activeMuscleExercises.length && (
                      <p className="rounded-xl bg-surface2 p-3 text-xs text-zinc-400">No exercises match this search.</p>
                    )}
                    {hasMoreExercises && (
                      <p className="px-1 py-2 text-center text-xs text-zinc-500">Scroll down to load more exercises...</p>
                    )}
                  </div>
                </div>
              </AppCard>
            </>
          )}

          {step === 3 && (
            <AppCard className="space-y-3">
              <div className="mb-1 flex items-center gap-2 text-lime"><LayoutTemplate className="h-4 w-4" /> Split Strategy</div>
              <div className="grid grid-cols-2 gap-2">
                {(["Auto", "PPL", "UpperLower", "FullBody"] as SplitPreference[]).map((s) => (
                  <SelectChip key={s} label={s} selected={splitPreference === s} onClick={() => setSplitPreference(s)} />
                ))}
              </div>
              <p className="text-xs text-zinc-400">
                Auto mode chooses the highest quality hypertrophy split for your selected training days.
              </p>
            </AppCard>
          )}

          {step === 4 && (
            <>
              <AppCard className="space-y-3">
                <div className="mb-1 flex items-center gap-2 text-lime"><Brain className="h-4 w-4" /> Progression & Fatigue</div>
                <div className="grid gap-2">
                  {(["DoubleProgression", "TopSetBackoff", "RepGoal"] as ProgressionModel[]).map((p) => (
                    <SelectChip key={p} label={p} selected={progressionModel === p} onClick={() => setProgressionModel(p)} />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["Low", "Moderate", "High"] as const).map((f) => (
                    <SelectChip key={f} label={`Fatigue ${f}`} selected={fatigueSensitivity === f} onClick={() => setFatigueSensitivity(f)} />
                  ))}
                </div>
                <NumberStepper label="RIR floor (global)" value={rirFloor} onChange={(v) => setRirFloor(Math.max(0, Math.min(4, Math.round(v))))} />
              </AppCard>

              <AppCard className="space-y-3">
                <div className="mb-1 flex items-center gap-2 text-lime"><Settings2 className="h-4 w-4" /> Advanced Controls</div>
                <div className="grid grid-cols-2 gap-2">
                  <SelectChip label="Deload Auto" selected={deloadMode === "Auto"} onClick={() => setDeloadMode("Auto")} />
                  <SelectChip label="Deload Manual" selected={deloadMode === "Manual"} onClick={() => setDeloadMode("Manual")} />
                </div>
                <NumberStepper
                  label="Deload week recommendation"
                  value={deloadWeek}
                  onChange={(v) => setDeloadWeek(Math.max(1, Math.min(mesoLength, Math.round(v))))}
                />
                <div className="grid grid-cols-3 gap-2">
                  {(["Conservative", "Moderate", "Aggressive"] as const).map((p) => (
                    <SelectChip key={p} label={p} selected={painProtocol === p} onClick={() => setPainProtocol(p)} />
                  ))}
                </div>
                <SelectChip label="Enable myo-reps support" selected={useMyoreps} onClick={() => setUseMyoreps((v) => !v)} />
              </AppCard>
            </>
          )}

          {step === 5 && (
            <AppCard className="space-y-3">
              <div className="mb-1 flex items-center gap-2 text-lime"><Dumbbell className="h-4 w-4" /> Plan Summary</div>
              <p className="text-sm">{daysPerWeek} days/week • {mesoLength}-week mesocycle • {splitPreference} split</p>
              <p className="text-sm">Model: {progressionModel} • Fatigue: {fatigueSensitivity} • RIR floor: {rirFloor} • Deload week: {deloadWeek}</p>
              <p className="text-xs text-zinc-400">Allocated exercise entries: {allocations.length}</p>
              <div className="space-y-2">
                {muscles.slice(0, 6).map((m) => (
                  <div key={m.muscle_group} className="rounded-xl bg-surface2 p-2 text-xs">
                    {m.muscle_group}: {m.target_sets} sets ({m.emphasis})
                  </div>
                ))}
              </div>
            </AppCard>
          )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-white/10 bg-appbg/95 px-4 pb-4 pt-3 backdrop-blur">
        <div className="flex gap-3">
          <SecondaryButton onClick={() => setStep((s) => Math.max(0, s - 1))} className={step === 0 ? "opacity-50" : ""}>
            Back
          </SecondaryButton>
          {step < steps.length - 1 ? (
            <PrimaryButton onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} disabled={!canContinue}>
              Continue
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={submitSetup}>
              {mode === "new_cycle" ? "Create Next Mesocycle" : "Create RP-Style Program"}
            </PrimaryButton>
          )}
        </div>
      </div>
    </ScreenContainer>
  );
}

function buildDefaultMuscles(level: ExperienceLevel): MuscleState[] {
  const base = level === "Beginner" ? 0 : level === "Intermediate" ? 2 : 4;
  const rows = [
    ["Chest", 8 + base, 16 + base],
    ["Back", 10 + base, 18 + base],
    ["Shoulders", 8 + base, 16 + base],
    ["Quads", 8 + base, 16 + base],
    ["Hamstrings", 6 + base, 14 + base],
    ["Glutes", 6 + base, 14 + base],
    ["Biceps", 6 + base, 14 + base],
    ["Triceps", 6 + base, 14 + base],
    ["Calves", 6 + base, 12 + base],
  ] as const;

  return rows.map(([muscle_group, mev, mrv]) => ({
    muscle_group,
    emphasis: "Grow" as EmphasisLevel,
    mev,
    mrv,
    target_sets: targetSetsFromEmphasis("Grow", mev, mrv),
  }));
}

function targetSetsFromEmphasis(e: EmphasisLevel, mev: number, mrv: number) {
  if (e === "Maintain") return Math.max(4, mev - 2);
  if (e === "Emphasize") return Math.min(mrv, mev + 3);
  return mev;
}
