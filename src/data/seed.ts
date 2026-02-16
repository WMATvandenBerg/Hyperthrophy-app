import type { AppSeedData } from "../types/models";

export const seedData: AppSeedData = {
  user: {
    id: "u1",
    first_name: "Alex",
    experience_level: "Intermediate",
    onboarding_completed: false,
    preferred_units: "kg",
  },
  program: {
    id: "p1",
    days_per_week: 5,
    current_week: 2,
    mesocycle_length: 6,
    status: "active",
  },
  training_days: [
    { id: "d1", program_id: "p1", day_number: 1, name: "Push A", muscle_groups: ["Chest", "Shoulders", "Triceps"] },
    { id: "d2", program_id: "p1", day_number: 2, name: "Pull A", muscle_groups: ["Back", "Biceps"] },
    { id: "d3", program_id: "p1", day_number: 3, name: "Legs", muscle_groups: ["Quads", "Hamstrings", "Glutes"] },
    { id: "d4", program_id: "p1", day_number: 4, name: "Upper", muscle_groups: ["Chest", "Back", "Arms"] },
    { id: "d5", program_id: "p1", day_number: 5, name: "Lower", muscle_groups: ["Quads", "Hamstrings", "Calves"] },
  ],
  volumes: [
    { id: "v1", program_id: "p1", muscle_group: "Chest", mev: 10, mrv: 18, current_volume: 13, is_focus: true },
    { id: "v2", program_id: "p1", muscle_group: "Back", mev: 12, mrv: 20, current_volume: 14, is_focus: true },
    { id: "v3", program_id: "p1", muscle_group: "Shoulders", mev: 8, mrv: 16, current_volume: 10, is_focus: false },
    { id: "v4", program_id: "p1", muscle_group: "Quads", mev: 10, mrv: 16, current_volume: 11, is_focus: false },
  ],
  exercises: [
    { id: "e1", name: "Incline Dumbbell Press", muscle_group: "Chest", equipment: "Dumbbell", is_system_exercise: true },
    { id: "e2", name: "Cable Fly", muscle_group: "Chest", equipment: "Cable", is_system_exercise: true },
    { id: "e3", name: "Lat Pulldown", muscle_group: "Back", equipment: "Machine", is_system_exercise: true },
    { id: "e4", name: "Romanian Deadlift", muscle_group: "Hamstrings", equipment: "Barbell", is_system_exercise: true },
    { id: "e5", name: "Single Arm Cable Row", muscle_group: "Back", equipment: "Cable", is_system_exercise: false },
  ],
  prescriptions: [
    { id: "pr1", training_day_id: "d1", exercise_id: "e1", sets: 4, target_reps: "8-12", target_load: 30, target_rir: 2, progression_reason: "Chest is below target volume" },
    { id: "pr2", training_day_id: "d1", exercise_id: "e2", sets: 3, target_reps: "12-15", target_load: 15, target_rir: 1, progression_reason: "High stimulus with low fatigue" },
    { id: "pr3", training_day_id: "d2", exercise_id: "e3", sets: 4, target_reps: "8-12", target_load: 60, target_rir: 2, progression_reason: "Back focus progression" },
  ],
  logs: [
    {
      id: "l1",
      exercise_prescription_id: "pr1",
      sets_completed: [
        { reps: 10, weight: 30, rir: 2, completed_at: "2026-02-10T08:15:00.000Z" },
        { reps: 9, weight: 30, rir: 1, completed_at: "2026-02-10T08:18:00.000Z" },
      ],
      total_volume_kg: 570,
      performance_rating: 8,
    },
  ],
  checkins: [
    { id: "c1", fatigue_level: 6, soreness_level: 5, motivation_level: 8, sleep_quality: 7, stress_level: 4, notes: "Felt good, small shoulder tightness.", created_at: "2026-02-09T18:00:00.000Z" },
    { id: "c2", fatigue_level: 7, soreness_level: 6, motivation_level: 7, sleep_quality: 6, stress_level: 5, notes: "Need extra sleep before leg day.", created_at: "2026-02-12T18:00:00.000Z" },
  ],
  mesocycle_history: [],
};
