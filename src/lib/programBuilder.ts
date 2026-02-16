import type {
  Exercise,
  ExerciseAllocationInput,
  ExercisePrescription,
  ProgressionModel,
  ProgramSetupInput,
  TrainingDay,
} from "../types/models";

type SplitTemplate = {
  name: string;
  muscle_groups: string[];
};

function getSplitTemplates(daysPerWeek: number, pref: ProgramSetupInput["split_preference"]): SplitTemplate[] {
  const auto = (() => {
    if (daysPerWeek === 3) {
      return [
        { name: "Full Body A", muscle_groups: ["Chest", "Back", "Quads", "Biceps"] },
        { name: "Full Body B", muscle_groups: ["Shoulders", "Hamstrings", "Glutes", "Triceps"] },
        { name: "Full Body C", muscle_groups: ["Chest", "Back", "Quads", "Calves"] },
      ];
    }
    if (daysPerWeek === 4) {
      return [
        { name: "Upper A", muscle_groups: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"] },
        { name: "Lower A", muscle_groups: ["Quads", "Hamstrings", "Glutes", "Calves"] },
        { name: "Upper B", muscle_groups: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"] },
        { name: "Lower B", muscle_groups: ["Quads", "Hamstrings", "Glutes", "Calves"] },
      ];
    }
    if (daysPerWeek === 5) {
      return [
        { name: "Push", muscle_groups: ["Chest", "Shoulders", "Triceps"] },
        { name: "Pull", muscle_groups: ["Back", "Biceps"] },
        { name: "Legs", muscle_groups: ["Quads", "Hamstrings", "Glutes", "Calves"] },
        { name: "Upper", muscle_groups: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"] },
        { name: "Lower", muscle_groups: ["Quads", "Hamstrings", "Glutes", "Calves"] },
      ];
    }
    return [
      { name: "Push A", muscle_groups: ["Chest", "Shoulders", "Triceps"] },
      { name: "Pull A", muscle_groups: ["Back", "Biceps"] },
      { name: "Legs A", muscle_groups: ["Quads", "Hamstrings", "Glutes", "Calves"] },
      { name: "Push B", muscle_groups: ["Chest", "Shoulders", "Triceps"] },
      { name: "Pull B", muscle_groups: ["Back", "Biceps"] },
      { name: "Legs B", muscle_groups: ["Quads", "Hamstrings", "Glutes", "Calves"] },
    ];
  })();

  if (pref === "Auto") return auto.slice(0, daysPerWeek);
  if (pref === "PPL") {
    const ppl = [
      { name: "Push", muscle_groups: ["Chest", "Shoulders", "Triceps"] },
      { name: "Pull", muscle_groups: ["Back", "Biceps"] },
      { name: "Legs", muscle_groups: ["Quads", "Hamstrings", "Glutes", "Calves"] },
      { name: "Push 2", muscle_groups: ["Chest", "Shoulders", "Triceps"] },
      { name: "Pull 2", muscle_groups: ["Back", "Biceps"] },
      { name: "Legs 2", muscle_groups: ["Quads", "Hamstrings", "Glutes", "Calves"] },
    ];
    return ppl.slice(0, daysPerWeek);
  }
  if (pref === "UpperLower") {
    const ul = [
      { name: "Upper A", muscle_groups: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"] },
      { name: "Lower A", muscle_groups: ["Quads", "Hamstrings", "Glutes", "Calves"] },
      { name: "Upper B", muscle_groups: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"] },
      { name: "Lower B", muscle_groups: ["Quads", "Hamstrings", "Glutes", "Calves"] },
      { name: "Upper C", muscle_groups: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"] },
      { name: "Lower C", muscle_groups: ["Quads", "Hamstrings", "Glutes", "Calves"] },
    ];
    return ul.slice(0, daysPerWeek);
  }

  const fullBody = Array.from({ length: daysPerWeek }).map((_, i) => ({
    name: `Full Body ${i + 1}`,
    muscle_groups: ["Chest", "Back", "Quads", "Hamstrings", "Shoulders", "Biceps", "Triceps"],
  }));
  return fullBody;
}

export function buildTrainingDays(programId: string, setup: ProgramSetupInput): TrainingDay[] {
  const templates = getSplitTemplates(setup.days_per_week, setup.split_preference);
  return templates.map((tpl, idx) => ({
    id: `d${idx + 1}`,
    program_id: programId,
    day_number: idx + 1,
    name: tpl.name,
    muscle_groups: tpl.muscle_groups,
  }));
}

function chooseDayForMuscle(trainingDays: TrainingDay[], muscle: string, rr: Record<string, number>) {
  const candidates = trainingDays.filter((d) => d.muscle_groups.includes(muscle));
  if (!candidates.length) return trainingDays[0];
  rr[muscle] = (rr[muscle] ?? 0) + 1;
  return candidates[(rr[muscle] - 1) % candidates.length];
}

function targetRepRange(muscle: string) {
  if (["Quads", "Hamstrings", "Glutes", "Back"].includes(muscle)) return "6-10";
  return "8-15";
}

export function buildPrescriptions(
  trainingDays: TrainingDay[],
  allocations: ExerciseAllocationInput[],
  exercises: Exercise[],
  progressionReason: string,
  modelOverrides?: Record<string, ProgressionModel>,
): ExercisePrescription[] {
  const rr: Record<string, number> = {};
  const prescriptions: ExercisePrescription[] = [];

  allocations
    .filter((a) => a.weekly_sets > 0)
    .forEach((alloc, idx) => {
      const day = chooseDayForMuscle(trainingDays, alloc.muscle_group, rr);
      const sets = Math.max(2, Math.min(6, Math.round(alloc.weekly_sets / 2)));
      const ex = exercises.find((e) => e.id === alloc.exercise_id);
      if (!ex) return;
      prescriptions.push({
        id: `pr${idx + 1}`,
        training_day_id: day.id,
        exercise_id: ex.id,
        sets,
        target_reps: targetRepRange(alloc.muscle_group),
        target_load: 30,
        target_rir: 2,
        progression_reason: `${progressionReason} • ${modelOverrides?.[ex.id] ?? "DoubleProgression"}`,
        progression_model: modelOverrides?.[ex.id],
      });
    });

  return prescriptions;
}

export function evenlyAllocateSets(totalSets: number, selectedExerciseIds: string[]): Record<string, number> {
  if (!selectedExerciseIds.length) return {};
  const base = Math.floor(totalSets / selectedExerciseIds.length);
  let rem = totalSets % selectedExerciseIds.length;
  const out: Record<string, number> = {};
  selectedExerciseIds.forEach((id) => {
    out[id] = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem -= 1;
  });
  return out;
}
