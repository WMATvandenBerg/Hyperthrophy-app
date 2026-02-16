export type ExperienceLevel = "Beginner" | "Intermediate" | "Advanced";
export type Units = "kg" | "lb";

export type EmphasisLevel = "Maintain" | "Grow" | "Emphasize";
export type SplitPreference = "Auto" | "PPL" | "UpperLower" | "FullBody";
export type ProgressionModel = "DoubleProgression" | "TopSetBackoff" | "RepGoal";

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  is_system_exercise: boolean;
}

export interface UserProfile {
  id: string;
  first_name: string;
  experience_level: ExperienceLevel;
  onboarding_completed: boolean;
  preferred_units: Units;
}

export interface Program {
  id: string;
  days_per_week: number;
  current_week: number;
  mesocycle_length: number;
  status: "active" | "completed";
  split_preference?: SplitPreference;
  progression_model?: ProgressionModel;
  deload_week?: number;
  suggestion_decisions?: SuggestionDecision[];
  smart_aggressiveness?: "Conservative" | "Balanced" | "Aggressive";
  suggestion_acceptance_rate?: number;
}

export interface TrainingDay {
  id: string;
  program_id: string;
  day_number: number;
  name: string;
  muscle_groups: string[];
}

export interface MuscleGroupVolume {
  id: string;
  program_id: string;
  muscle_group: string;
  mev: number;
  mrv: number;
  current_volume: number;
  is_focus: boolean;
}

export interface ExercisePrescription {
  id: string;
  training_day_id: string;
  exercise_id: string;
  sets: number;
  target_reps: string;
  target_load: number;
  target_rir: number;
  progression_reason: string;
  progression_model?: ProgressionModel;
}

export interface LoggedSet {
  reps: number;
  weight: number;
  rir: number;
  completed_at: string;
}

export interface ExerciseLog {
  id: string;
  exercise_prescription_id: string;
  exercise_id?: string;
  sets_completed: LoggedSet[];
  total_volume_kg: number;
  performance_rating: number;
  prescribed_sets?: number;
  sets_completed_count?: number;
  unused_sets?: number;
  unused_set_reason?: "load_too_heavy" | "fatigue" | "time" | "pain" | "technique" | "equipment" | "other";
  unused_set_severity?: number;
  unused_set_note?: string;
  rep_target_min?: number;
  rep_target_max?: number;
  over_rep_flag?: boolean;
  next_load_recommendation?: number;
}

export interface WeeklyCheckIn {
  id: string;
  fatigue_level: number;
  soreness_level: number;
  motivation_level: number;
  sleep_quality: number;
  stress_level: number;
  notes?: string;
  created_at: string;
}

export interface MuscleSetupInput {
  muscle_group: string;
  emphasis: EmphasisLevel;
  mev: number;
  mrv: number;
  target_sets: number;
}

export interface ExerciseAllocationInput {
  exercise_id: string;
  muscle_group: string;
  weekly_sets: number;
}

export interface ProSettingsInput {
  progression_model: ProgressionModel;
  fatigue_sensitivity: "Low" | "Moderate" | "High";
  rir_floor: number;
  use_myoreps: boolean;
  deload_mode: "Auto" | "Manual";
  deload_week?: number;
  pain_protocol: "Conservative" | "Moderate" | "Aggressive";
}

export interface ProgramSetupInput {
  experience_level: ExperienceLevel;
  days_per_week: number;
  mesocycle_length: number;
  split_preference: SplitPreference;
  muscle_setups: MuscleSetupInput[];
  exercise_allocations: ExerciseAllocationInput[];
  exercise_model_overrides?: Record<string, ProgressionModel>;
  suggestion_decisions?: SuggestionDecision[];
  smart_aggressiveness?: "Conservative" | "Balanced" | "Aggressive";
  pro_settings: ProSettingsInput;
}

export interface SuggestionItem {
  field: string;
  suggestion: string;
  confidence: "High" | "Medium" | "Low";
  rationale: string;
}

export interface SuggestionDecision {
  field: string;
  accepted: boolean;
  suggested_value: string;
  applied_value?: string;
}

export interface MesocycleSummary {
  id: string;
  created_at: string;
  previous_program_id: string;
  days_per_week: number;
  mesocycle_length: number;
  completion_rate: number;
  avg_fatigue: number;
  avg_rep_dropoff: number;
  suggestion_acceptance_rate: number;
  suggestion_effectiveness_score: number;
  smart_aggressiveness: "Conservative" | "Balanced" | "Aggressive";
  notes: string;
}

export interface AppSeedData {
  user: UserProfile;
  program: Program;
  training_days: TrainingDay[];
  volumes: MuscleGroupVolume[];
  exercises: Exercise[];
  prescriptions: ExercisePrescription[];
  logs: ExerciseLog[];
  checkins: WeeklyCheckIn[];
  mesocycle_history: MesocycleSummary[];
}
