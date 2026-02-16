import { seedData } from "../data/seed";
import { buildPrescriptions, buildTrainingDays } from "./programBuilder";
import type {
  AppSeedData,
  Exercise,
  ExerciseLog,
  MesocycleSummary,
  ProgramSetupInput,
  UserProfile,
  WeeklyCheckIn,
} from "../types/models";

const STORAGE_KEY = "hypertrophy-db-v1";
const EXERCISE_CACHE_KEY = "hypertrophy-external-exercises-v1";
const EXERCISE_SOURCE_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadDb(): AppSeedData {
  if (!canUseStorage()) return structuredClone(seedData);
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(seedData);
  try {
    const parsed = JSON.parse(raw) as Partial<AppSeedData>;
    const base = structuredClone(seedData);
    const safeUser =
      parsed.user && typeof parsed.user === "object"
        ? { ...base.user, ...parsed.user }
        : base.user;
    const safeProgram =
      parsed.program && typeof parsed.program === "object"
        ? { ...base.program, ...parsed.program }
        : base.program;
    return {
      ...base,
      ...parsed,
      user: safeUser,
      program: safeProgram,
      training_days: Array.isArray(parsed.training_days) ? parsed.training_days : base.training_days,
      volumes: Array.isArray(parsed.volumes) ? parsed.volumes : base.volumes,
      exercises: Array.isArray(parsed.exercises) ? parsed.exercises : base.exercises,
      prescriptions: Array.isArray(parsed.prescriptions) ? parsed.prescriptions : base.prescriptions,
      logs: Array.isArray(parsed.logs) ? parsed.logs : base.logs,
      checkins: Array.isArray(parsed.checkins) ? parsed.checkins : base.checkins,
      mesocycle_history: Array.isArray(parsed.mesocycle_history) ? parsed.mesocycle_history : [],
    } as AppSeedData;
  } catch {
    return structuredClone(seedData);
  }
}

function persistDb(data: AppSeedData) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let db: AppSeedData = loadDb();
let externalExercisesHydration: Promise<void> | null = null;

const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

type ExternalExercise = {
  id?: string;
  name?: string;
  equipment?: string | null;
  primaryMuscles?: string[];
};

function normalizeEquipment(raw: string | null | undefined) {
  const safe = (raw ?? "Other").trim();
  if (!safe) return "Other";
  return safe
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function mapPrimaryMuscleGroup(primaryMuscles: string[] | undefined) {
  const primary = (primaryMuscles?.[0] ?? "").toLowerCase();
  const lookup: Record<string, string> = {
    chest: "Chest",
    shoulders: "Shoulders",
    triceps: "Triceps",
    biceps: "Biceps",
    calves: "Calves",
    glutes: "Glutes",
    hamstrings: "Hamstrings",
    quadriceps: "Quads",
    lats: "Back",
    "middle back": "Back",
    traps: "Back",
    forearms: "Biceps",
    abdominals: "Core",
    "lower back": "Back",
    neck: "Shoulders",
    adductors: "Quads",
    abductors: "Glutes",
  };
  return lookup[primary] ?? "Back";
}

function dedupeKey(name: string, muscle_group: string) {
  return `${name.trim().toLowerCase()}::${muscle_group.trim().toLowerCase()}`;
}

function parseExternalExercises(input: unknown): Exercise[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const mapped: Exercise[] = [];

  for (const raw of input as ExternalExercise[]) {
    const name = raw?.name?.trim();
    if (!name) continue;
    const muscle_group = mapPrimaryMuscleGroup(raw.primaryMuscles);
    const key = dedupeKey(name, muscle_group);
    if (seen.has(key)) continue;
    seen.add(key);

    mapped.push({
      id: `ext_${raw.id ?? key.replace(/[^a-z0-9]/gi, "_")}`,
      name,
      muscle_group,
      equipment: normalizeEquipment(raw.equipment),
      is_system_exercise: true,
    });
  }

  return mapped;
}

function mergeExternalExercises(external: Exercise[]) {
  if (!external.length) return;
  const existingByKey = new Set(db.exercises.map((e) => dedupeKey(e.name, e.muscle_group)));
  const toAdd = external.filter((e) => !existingByKey.has(dedupeKey(e.name, e.muscle_group)));
  if (!toAdd.length) return;
  db.exercises = [...db.exercises, ...toAdd];
  persistDb(db);
}

function readCachedExternalExercises(): Exercise[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(EXERCISE_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return parseExternalExercises(parsed);
  } catch {
    return [];
  }
}

function writeCachedExternalExercises(rawData: unknown) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(EXERCISE_CACHE_KEY, JSON.stringify(rawData));
}

async function fetchExternalExercises(): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(EXERCISE_SOURCE_URL, { signal: controller.signal });
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

async function hydrateExternalExerciseLibrary() {
  if (externalExercisesHydration) {
    await externalExercisesHydration;
    return;
  }

  externalExercisesHydration = (async () => {
    const cached = readCachedExternalExercises();
    if (cached.length) {
      mergeExternalExercises(cached);
    }

    const fetchedRaw = await fetchExternalExercises();
    const fetched = parseExternalExercises(fetchedRaw);
    if (fetched.length) {
      writeCachedExternalExercises(fetchedRaw);
      mergeExternalExercises(fetched);
    }
  })();

  await externalExercisesHydration;
}

function summarizeCurrentMesocycle(data: AppSeedData): MesocycleSummary {
  const prescribed = data.logs.reduce((acc, l) => acc + (l.prescribed_sets ?? l.sets_completed.length), 0);
  const completed = data.logs.reduce((acc, l) => acc + l.sets_completed.length, 0);
  const completionRate = prescribed ? completed / prescribed : 1;
  const avgFatigue = data.checkins.length
    ? data.checkins.reduce((acc, c) => acc + c.fatigue_level, 0) / data.checkins.length
    : 5;
  const dropoffScores = data.logs
    .map((l) => {
      if (l.sets_completed.length < 2) return 0;
      const first = l.sets_completed[0].reps;
      const last = l.sets_completed[l.sets_completed.length - 1].reps;
      if (first <= 0) return 0;
      return Math.max(0, (first - last) / first);
    })
    .filter((x) => Number.isFinite(x));
  const avgRepDropoff = dropoffScores.length ? dropoffScores.reduce((a, b) => a + b, 0) / dropoffScores.length : 0;
  const decisions = Array.isArray(data.program.suggestion_decisions) ? data.program.suggestion_decisions : [];
  const acceptanceRate = decisions.length
    ? decisions.filter((d) => d.accepted).length / decisions.length
    : 0.5;
  const effectivenessScore = Math.max(
    0,
    Math.min(1, completionRate * 0.5 + (1 - avgFatigue / 10) * 0.3 + (1 - avgRepDropoff) * 0.2),
  );

  return {
    id: `m${Date.now()}`,
    created_at: new Date().toISOString(),
    previous_program_id: data.program.id,
    days_per_week: data.program.days_per_week,
    mesocycle_length: data.program.mesocycle_length,
    completion_rate: Number(completionRate.toFixed(2)),
    avg_fatigue: Number(avgFatigue.toFixed(1)),
    avg_rep_dropoff: Number(avgRepDropoff.toFixed(2)),
    suggestion_acceptance_rate: Number(acceptanceRate.toFixed(2)),
    suggestion_effectiveness_score: Number(effectivenessScore.toFixed(2)),
    smart_aggressiveness: data.program.smart_aggressiveness ?? "Balanced",
    notes:
      completionRate < 0.85
        ? "Completion below target; consider reducing starting volume."
        : effectivenessScore >= 0.75
          ? "Smart suggestions performed well this cycle."
          : "Mixed response; keep smart presets editable and review key muscles.",
  };
}

function applyProgramSetup(setup: ProgramSetupInput) {
  db.user = {
    ...db.user,
    experience_level: setup.experience_level,
    onboarding_completed: true,
  };

    db.program = {
      ...db.program,
      id: `p${Date.now()}`,
      days_per_week: setup.days_per_week,
      current_week: 1,
      mesocycle_length: setup.mesocycle_length,
      status: "active",
      split_preference: setup.split_preference,
      progression_model: setup.pro_settings.progression_model,
      deload_week: setup.pro_settings.deload_week,
      suggestion_decisions: setup.suggestion_decisions ?? [],
      smart_aggressiveness: setup.smart_aggressiveness ?? "Balanced",
      suggestion_acceptance_rate: setup.suggestion_decisions?.length
        ? setup.suggestion_decisions.filter((d) => d.accepted).length / setup.suggestion_decisions.length
        : undefined,
    };

  db.volumes = setup.muscle_setups.map((m, i) => ({
    id: `v${i + 1}`,
    program_id: db.program.id,
    muscle_group: m.muscle_group,
    mev: m.mev,
    mrv: m.mrv,
    current_volume: m.target_sets,
    is_focus: m.emphasis === "Emphasize",
  }));

  db.training_days = buildTrainingDays(db.program.id, setup);
    db.prescriptions = buildPrescriptions(
      db.training_days,
      setup.exercise_allocations,
      db.exercises,
      `Built from ${setup.pro_settings.progression_model} with ${setup.pro_settings.fatigue_sensitivity} fatigue sensitivity`,
      setup.exercise_model_overrides,
    );
}

export const base44Client = {
  async getDashboardData() {
    await wait();
    await hydrateExternalExerciseLibrary();
    return db;
  },

  async completeOnboarding(setup: ProgramSetupInput) {
    await wait();
    applyProgramSetup(setup);
    persistDb(db);
    return db.user;
  },

  async setAuthenticatedUser(user: Partial<UserProfile>) {
    await wait();
    db.user = {
      ...db.user,
      ...user,
    };
    persistDb(db);
    return db.user;
  },

  async startNewMesocycle(setup: ProgramSetupInput) {
    await wait();
    if (db.user.onboarding_completed) {
      db.mesocycle_history.unshift(summarizeCurrentMesocycle(db));
    }
    applyProgramSetup(setup);
    persistDb(db);
    return db.program;
  },

  async createCustomExercise(exercise: Omit<Exercise, "id" | "is_system_exercise">) {
    await wait();
    const created: Exercise = {
      id: `e${Date.now()}`,
      is_system_exercise: false,
      ...exercise,
    };
    db.exercises.unshift(created);
    persistDb(db);
    return created;
  },

  async saveExerciseLog(log: ExerciseLog) {
    await wait();
    db.logs.unshift(log);
    persistDb(db);
    return log;
  },

  async createCheckin(checkin: WeeklyCheckIn) {
    await wait();
    db.checkins.unshift(checkin);
    persistDb(db);
    return checkin;
  },
};
