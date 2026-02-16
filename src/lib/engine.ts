import type {
  AppSeedData,
  ExerciseLog,
  MuscleGroupVolume,
  ProgressionModel,
  ProgramSetupInput,
  SuggestionItem,
  WeeklyCheckIn,
} from "../types/models";

export type VolumeAction = "increase" | "hold" | "reduce" | "deload";

export interface MuscleRecommendation {
  muscle_group: string;
  action: VolumeAction;
  next_week_sets: number;
  reason: string;
}

export interface ProgramInsights {
  readiness_score: number;
  readiness_label: "Low" | "Moderate" | "High";
  deload_flag: boolean;
  performance_trend: "down" | "stable" | "up";
  weekly_target_sets: number;
  recommendations: MuscleRecommendation[];
}

export interface SmartCyclePreset {
  setup: ProgramSetupInput;
  suggestions: SuggestionItem[];
  smart_aggressiveness: "Conservative" | "Balanced" | "Aggressive";
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function computeReadiness(checkin?: WeeklyCheckIn): number {
  if (!checkin) return 65;
  const fatigue = 10 - checkin.fatigue_level;
  const soreness = 10 - checkin.soreness_level;
  const sleep = checkin.sleep_quality;
  const motivation = checkin.motivation_level;
  const stress = 10 - checkin.stress_level;
  const score10 = fatigue * 0.26 + soreness * 0.16 + sleep * 0.22 + motivation * 0.22 + stress * 0.14;
  return Math.max(0, Math.min(100, Math.round(score10 * 10)));
}

function getReadinessLabel(score: number): "Low" | "Moderate" | "High" {
  if (score < 45) return "Low";
  if (score < 75) return "Moderate";
  return "High";
}

function computePerformanceTrend(logs: ExerciseLog[]): "down" | "stable" | "up" {
  if (logs.length < 4) return "stable";
  const recent = logs.slice(0, 3).map((l) => l.performance_rating);
  const previous = logs.slice(3, 6).map((l) => l.performance_rating);
  const delta = avg(recent) - avg(previous);
  if (delta > 0.4) return "up";
  if (delta < -0.4) return "down";
  return "stable";
}

function recommendForMuscle(volume: MuscleGroupVolume, readinessScore: number, trend: "down" | "stable" | "up"): MuscleRecommendation {
  const base = volume.current_volume;

  if (readinessScore < 35 || (trend === "down" && readinessScore < 50)) {
    return {
      muscle_group: volume.muscle_group,
      action: "deload",
      next_week_sets: Math.max(6, Math.floor(base * 0.65)),
      reason: "Recovery markers are low and performance is declining.",
    };
  }

  if (readinessScore < 50) {
    return {
      muscle_group: volume.muscle_group,
      action: "reduce",
      next_week_sets: Math.max(volume.mev, base - 2),
      reason: "Readiness is suppressed; pull back toward MEV.",
    };
  }

  if (base < volume.mev) {
    return {
      muscle_group: volume.muscle_group,
      action: "increase",
      next_week_sets: volume.mev,
      reason: "Current volume is below MEV.",
    };
  }

  if (base >= volume.mrv || (trend === "down" && readinessScore < 65)) {
    return {
      muscle_group: volume.muscle_group,
      action: "hold",
      next_week_sets: Math.max(volume.mev, base - 1),
      reason: "Near MRV or mild fatigue signals; hold to consolidate.",
    };
  }

  if (readinessScore >= 75 || (volume.is_focus && readinessScore >= 65)) {
    return {
      muscle_group: volume.muscle_group,
      action: "increase",
      next_week_sets: Math.min(volume.mrv, base + (volume.is_focus ? 2 : 1)),
      reason: "Recovery is strong; continue overload progression.",
    };
  }

  return {
    muscle_group: volume.muscle_group,
    action: "hold",
    next_week_sets: base,
    reason: "Within productive range; keep volume stable.",
  };
}

export function generateProgramInsights(data: AppSeedData): ProgramInsights {
  const checkins = Array.isArray(data.checkins) ? data.checkins : [];
  const logs = Array.isArray(data.logs) ? data.logs : [];
  const volumes = Array.isArray(data.volumes) ? data.volumes : [];

  const latestCheckin = [...checkins].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
  const readiness_score = computeReadiness(latestCheckin);
  const readiness_label = getReadinessLabel(readiness_score);
  const performance_trend = computePerformanceTrend(
    [...logs].sort((a, b) => +new Date(b.sets_completed[0]?.completed_at ?? 0) - +new Date(a.sets_completed[0]?.completed_at ?? 0)),
  );

  const recommendations = volumes.map((v) => recommendForMuscle(v, readiness_score, performance_trend));
  const deload_flag = recommendations.some((r) => r.action === "deload");
  const weekly_target_sets = recommendations.reduce((acc, rec) => acc + rec.next_week_sets, 0);

  return {
    readiness_score,
    readiness_label,
    deload_flag,
    performance_trend,
    weekly_target_sets,
    recommendations,
  };
}

function confidenceFromSample(size: number): "High" | "Medium" | "Low" {
  if (size >= 8) return "High";
  if (size >= 4) return "Medium";
  return "Low";
}

function confidenceDelta(base: "High" | "Medium" | "Low", effectiveness: number): "High" | "Medium" | "Low" {
  const rank = { Low: 0, Medium: 1, High: 2 } as const;
  let next = rank[base];
  if (effectiveness >= 0.75) next += 1;
  if (effectiveness <= 0.45) next -= 1;
  const clamped = Math.max(0, Math.min(2, next));
  return (Object.keys(rank).find((k) => rank[k as keyof typeof rank] === clamped) ?? "Medium") as "High" | "Medium" | "Low";
}

function historicalEffectiveness(data: AppSeedData) {
  const history = Array.isArray(data.mesocycle_history) ? data.mesocycle_history : [];
  if (!history.length) return 0.62;
  const vals = history
    .map((m) => m.suggestion_effectiveness_score)
    .filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  if (!vals.length) return 0.62;
  return avg(vals);
}

function deriveAggressiveness(data: AppSeedData): "Conservative" | "Balanced" | "Aggressive" {
  const eff = historicalEffectiveness(data);
  if (eff >= 0.75) return "Aggressive";
  if (eff <= 0.5) return "Conservative";
  return "Balanced";
}

function getExerciseOverRepRate(data: AppSeedData, muscle: string) {
  const exercises = Array.isArray(data.exercises) ? data.exercises : [];
  const logs = Array.isArray(data.logs) ? data.logs : [];
  const exerciseIds = exercises.filter((e) => e.muscle_group === muscle).map((e) => e.id);
  const scoped = logs.filter((l) => l.exercise_id && exerciseIds.includes(l.exercise_id));
  if (!scoped.length) return { rate: 0, n: 0 };
  const hit = scoped.filter((l) => l.over_rep_flag).length;
  return { rate: hit / scoped.length, n: scoped.length };
}

function getMuscleMissRate(data: AppSeedData, muscle: string) {
  const exercises = Array.isArray(data.exercises) ? data.exercises : [];
  const logs = Array.isArray(data.logs) ? data.logs : [];
  const exerciseIds = exercises.filter((e) => e.muscle_group === muscle).map((e) => e.id);
  const scoped = logs.filter((l) => l.exercise_id && exerciseIds.includes(l.exercise_id));
  const prescribed = scoped.reduce((acc, l) => acc + (l.prescribed_sets ?? l.sets_completed.length), 0);
  const missed = scoped.reduce((acc, l) => acc + Math.max(0, l.unused_sets ?? 0), 0);
  return { missRate: prescribed ? missed / prescribed : 0, n: scoped.length };
}

function getRepDropoff(log: ExerciseLog) {
  if (log.sets_completed.length < 2) return 0;
  const first = log.sets_completed[0].reps;
  const last = log.sets_completed[log.sets_completed.length - 1].reps;
  if (!first) return 0;
  return Math.max(0, (first - last) / first);
}

function recommendModelForExercise(logs: ExerciseLog[]): { model: ProgressionModel; rationale: string } {
  if (!logs.length) return { model: "DoubleProgression", rationale: "No history available; defaulting to robust baseline model." };
  const overRepRate = logs.filter((l) => l.over_rep_flag).length / logs.length;
  const underCompleteRate = logs.filter((l) => (l.unused_sets ?? 0) > 0).length / logs.length;
  const repDropoff = avg(logs.map(getRepDropoff));

  if (underCompleteRate > 0.35 || repDropoff > 0.33) {
    return { model: "RepGoal", rationale: "High rep dropoff/under-completion suggests a fatigue-managed progression model." };
  }
  if (overRepRate > 0.4) {
    return { model: "TopSetBackoff", rationale: "Frequent over-rep outcomes suggest capacity for heavier top-set loading." };
  }
  return { model: "DoubleProgression", rationale: "Balanced completion and rep profile support double progression." };
}

export function generateSmartCyclePreset(data: AppSeedData): SmartCyclePreset {
  const checkins = Array.isArray(data.checkins) ? data.checkins : [];
  const logs = Array.isArray(data.logs) ? data.logs : [];
  const exercises = Array.isArray(data.exercises) ? data.exercises : [];
  const volumes = Array.isArray(data.volumes) ? data.volumes : [];
  const prescriptions = Array.isArray(data.prescriptions) ? data.prescriptions : [];

  const latestCheckin = [...checkins].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
  const readiness = computeReadiness(latestCheckin);
  const aggressiveness = deriveAggressiveness(data);
  const historicalEff = historicalEffectiveness(data);
  const suggestions: SuggestionItem[] = [];

  const muscle_setups = volumes.map((v) => {
    const miss = getMuscleMissRate(data, v.muscle_group);
    const overRep = getExerciseOverRepRate(data, v.muscle_group);

    let target = v.current_volume;
    let emphasis: "Maintain" | "Grow" | "Emphasize" = v.is_focus ? "Emphasize" : "Grow";
    let rationale = "Stable performance and adherence.";

    if (miss.missRate > (aggressiveness === "Conservative" ? 0.14 : 0.18)) {
      target = Math.max(v.mev, v.current_volume - 1);
      emphasis = "Maintain";
      rationale = `Missed set rate ${Math.round(miss.missRate * 100)}% suggests volume was slightly high.`;
    } else if (overRep.rate > 0.3 && readiness >= 65) {
      const stepUp = aggressiveness === "Aggressive" ? 2 : 1;
      target = Math.min(v.mrv, v.current_volume + stepUp);
      emphasis = v.is_focus ? "Emphasize" : "Grow";
      rationale = "Frequent over-rep outcomes suggest additional productive capacity.";
    }

    suggestions.push({
      field: `muscle.${v.muscle_group}.target_sets`,
      suggestion: `${target} sets`,
      confidence: confidenceDelta(confidenceFromSample(Math.max(miss.n, overRep.n)), historicalEff),
      rationale,
    });

    return {
      muscle_group: v.muscle_group,
      emphasis,
      mev: v.mev,
      mrv: v.mrv,
      target_sets: target,
    };
  });

  const globalMiss = avg(
    logs.map((l) => {
      const p = l.prescribed_sets ?? l.sets_completed.length;
      if (!p) return 0;
      return Math.max(0, l.unused_sets ?? 0) / p;
    }),
  );

  const missThreshold = aggressiveness === "Conservative" ? 0.18 : 0.22;
  const daysPerWeek = globalMiss > missThreshold ? Math.max(3, data.program.days_per_week - 1) : data.program.days_per_week;
  const mesoLength = readiness < 50 ? 5 : data.program.mesocycle_length;
  const avgDropoff = avg(logs.map(getRepDropoff));
  const deloadWeek = readiness < 50 || globalMiss > 0.2 || avgDropoff > 0.3 ? Math.max(3, mesoLength - 1) : mesoLength;

  suggestions.push({
    field: "program.days_per_week",
    suggestion: `${daysPerWeek}`,
    confidence: confidenceDelta(confidenceFromSample(logs.length), historicalEff),
    rationale: globalMiss > 0.22 ? "High incomplete-set trend suggests lower weekly session burden." : "Current training frequency appears sustainable.",
  });

  suggestions.push({
    field: "program.mesocycle_length",
    suggestion: `${mesoLength} weeks`,
    confidence: confidenceDelta("Medium", historicalEff),
    rationale: readiness < 50 ? "Lower readiness favors shorter mesocycle with earlier resensitization." : "Readiness profile supports current cycle length.",
  });

  const overRepGlobal = logs.filter((l) => l.over_rep_flag).length / Math.max(1, logs.length);
  const progression_model = overRepGlobal > 0.35 ? "DoubleProgression" : data.program.progression_model ?? "DoubleProgression";

  suggestions.push({
    field: "pro.progression_model",
    suggestion: progression_model,
    confidence: confidenceDelta(confidenceFromSample(logs.length), historicalEff),
    rationale: overRepGlobal > 0.35 ? "High over-rep frequency favors load-progressive model." : "Current progression model remains suitable.",
  });

  suggestions.push({
    field: "pro.deload_week",
    suggestion: `Week ${deloadWeek}`,
    confidence: confidenceDelta(confidenceFromSample(logs.length), historicalEff),
    rationale: deloadWeek < mesoLength ? "Recovery/rep-dropoff profile suggests earlier deload timing." : "Current trend supports deload at cycle end.",
  });

  const exercise_model_overrides: Record<string, ProgressionModel> = {};
  exercises.forEach((exercise) => {
    const exLogs = logs.filter((l) => l.exercise_id === exercise.id);
    const rec = recommendModelForExercise(exLogs);
    exercise_model_overrides[exercise.id] = rec.model;
    if (exLogs.length > 0) {
      suggestions.push({
        field: `exercise.${exercise.name}.model`,
        suggestion: rec.model,
        confidence: confidenceDelta(confidenceFromSample(exLogs.length), historicalEff),
        rationale: rec.rationale,
      });
    }
  });

  const setup: ProgramSetupInput = {
    experience_level: data.user.experience_level,
    days_per_week: daysPerWeek,
    mesocycle_length: mesoLength,
    split_preference: data.program.split_preference ?? "Auto",
    muscle_setups,
    exercise_allocations: prescriptions.map((p) => {
      const ex = exercises.find((e) => e.id === p.exercise_id);
      return {
        exercise_id: p.exercise_id,
        muscle_group: ex?.muscle_group ?? "Chest",
        weekly_sets: p.sets,
      };
    }),
    exercise_model_overrides,
    smart_aggressiveness: aggressiveness,
    suggestion_decisions: suggestions.map((s) => ({
      field: s.field,
      accepted: true,
      suggested_value: s.suggestion,
      applied_value: s.suggestion,
    })),
    pro_settings: {
      progression_model,
      fatigue_sensitivity: readiness < 50 ? "High" : readiness < 70 ? "Moderate" : "Low",
      rir_floor: 1,
      use_myoreps: false,
      deload_mode: "Auto",
      deload_week: deloadWeek,
      pain_protocol: "Moderate",
    },
  };

  return { setup, suggestions, smart_aggressiveness: aggressiveness };
}
