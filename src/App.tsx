import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BarChart3, Calendar, Dumbbell, Home, User } from "lucide-react";
import { Component, useMemo } from "react";
import { ScreenContainer } from "./components/ui";
import {
  useAppData,
  useCompleteOnboarding,
  useCreateCheckin,
  useCreateCustomExercise,
  useEndMesocycleEarly,
  useSaveExerciseLog,
  useSetAuthenticatedUser,
  useStartNewMesocycle,
} from "./hooks/useAppData";
import { generateSmartCyclePreset } from "./lib/engine";
import { getStoredSession, loginWithEmail, logoutSession, registerWithEmail, type AuthSession } from "./lib/auth";
import { CheckInScreen } from "./screens/CheckInScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { OnboardingFlow } from "./screens/OnboardingFlow";
import { ProfileScreen } from "./screens/ProfileScreen";
import { ProgressScreen } from "./screens/ProgressScreen";
import { ScheduleScreen } from "./screens/ScheduleScreen";
import { WorkoutScreen } from "./screens/WorkoutScreen";
import { useState } from "react";
import type { AppSeedData, ProgramSetupInput } from "./types/models";
import type { SmartCyclePreset } from "./lib/engine";

const queryClient = new QueryClient();

type Tab = "dashboard" | "workouts" | "progress" | "schedule" | "profile";

function AppContent() {
  const { data, isLoading } = useAppData();
  const completeOnboarding = useCompleteOnboarding();
  const createExercise = useCreateCustomExercise();
  const createCheckin = useCreateCheckin();
  const saveLog = useSaveExerciseLog();
  const startNewMesocycle = useStartNewMesocycle();
  const endMesocycleEarly = useEndMesocycleEarly();
  const setAuthenticatedUser = useSetAuthenticatedUser();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [cycleBuilderOpen, setCycleBuilderOpen] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());
  const [workoutDayIntent, setWorkoutDayIntent] = useState<string | null>(null);

  const tabs = useMemo(
    () => [
      { id: "dashboard" as Tab, label: "Dashboard", icon: Home },
      { id: "workouts" as Tab, label: "Workouts", icon: Dumbbell },
      { id: "progress" as Tab, label: "Progress", icon: BarChart3 },
      { id: "schedule" as Tab, label: "Schedule", icon: Calendar },
      { id: "profile" as Tab, label: "Profile", icon: User },
    ],
    [],
  );

  const safeData = useMemo(() => (data ? normalizeData(data) : null), [data]);
  const baselineSetup = useMemo<ProgramSetupInput | null>(
    () => (safeData ? buildSetupFromCurrentData(safeData) : null),
    [safeData],
  );

  const smartPreset = useMemo<SmartCyclePreset>(() => {
    if (!safeData) {
      return {
        smart_aggressiveness: "Balanced",
        suggestions: [],
        setup: {
          experience_level: "Intermediate",
          days_per_week: 4,
          mesocycle_length: 6,
          split_preference: "Auto",
          muscle_setups: [],
          exercise_allocations: [],
          exercise_model_overrides: {},
          smart_aggressiveness: "Balanced",
          suggestion_decisions: [],
          pro_settings: {
            progression_model: "DoubleProgression",
            fatigue_sensitivity: "Moderate",
            rir_floor: 1,
            use_myoreps: false,
            deload_mode: "Auto",
            deload_week: 6,
            pain_protocol: "Moderate",
          },
        },
      };
    }
    try {
      return generateSmartCyclePreset(safeData);
    } catch {
      return {
        smart_aggressiveness: "Balanced",
        suggestions: [
          {
            field: "fallback",
            suggestion: "Safe defaults applied",
            confidence: "Low",
            rationale: "Recovered from legacy/corrupted local data. You can reconfigure everything.",
          },
        ],
        setup: {
          experience_level: safeData.user.experience_level,
          days_per_week: safeData.program.days_per_week,
          mesocycle_length: safeData.program.mesocycle_length,
          split_preference: safeData.program.split_preference ?? "Auto",
          muscle_setups: safeData.volumes.map((v) => ({
            muscle_group: v.muscle_group,
            emphasis: v.is_focus ? "Emphasize" : "Grow",
            mev: v.mev,
            mrv: v.mrv,
            target_sets: v.current_volume,
          })),
          exercise_allocations: safeData.prescriptions.map((p) => {
            const ex = safeData.exercises.find((e) => e.id === p.exercise_id);
            return {
              exercise_id: p.exercise_id,
              muscle_group: ex?.muscle_group ?? "Chest",
              weekly_sets: p.sets,
            };
          }),
          exercise_model_overrides: Object.fromEntries(
            safeData.prescriptions.map((p) => [p.exercise_id, p.progression_model ?? "DoubleProgression"]),
          ),
          smart_aggressiveness: "Balanced",
          suggestion_decisions: [],
          pro_settings: {
            progression_model: safeData.program.progression_model ?? "DoubleProgression",
            fatigue_sensitivity: "Moderate",
            rir_floor: 1,
            use_myoreps: false,
            deload_mode: "Auto",
            deload_week: safeData.program.deload_week ?? safeData.program.mesocycle_length,
            pain_protocol: "Moderate",
          },
        },
      };
    }
  }, [safeData]);

  if (isLoading || !safeData) {
    return <ScreenContainer hideNav><p className="text-zinc-400">Loading training data...</p></ScreenContainer>;
  }

  if (!session) {
    return (
      <LoginScreen
        onLogin={async (email, password) => {
          const next = await loginWithEmail(email, password);
          setSession(next);
          await setAuthenticatedUser.mutateAsync({
            id: next.user_id,
            first_name: next.name.split(" ")[0] ?? "Athlete",
          });
        }}
        onRegister={async ({ name, email, password }) => {
          const next = await registerWithEmail({ name, email, password });
          setSession(next);
          await setAuthenticatedUser.mutateAsync({
            id: next.user_id,
            first_name: next.name.split(" ")[0] ?? "Athlete",
          });
        }}
      />
    );
  }

  if (!safeData.user.onboarding_completed || cycleBuilderOpen) {
    return (
      <OnboardingFlow
        exercises={safeData.exercises}
        onCreateExercise={async ({ name, muscle_group, equipment }) =>
          createExercise.mutateAsync({ name, muscle_group, equipment })
        }
        mode={safeData.user.onboarding_completed ? "new_cycle" : "onboarding"}
        smartPreset={safeData.user.onboarding_completed ? smartPreset : null}
        baselineSetup={safeData.user.onboarding_completed ? baselineSetup : null}
        onCancel={safeData.user.onboarding_completed ? () => setCycleBuilderOpen(false) : undefined}
        onComplete={async (setup) => {
          if (safeData.user.onboarding_completed) {
            await startNewMesocycle.mutateAsync(setup);
            setCycleBuilderOpen(false);
          } else {
            await completeOnboarding.mutateAsync(setup);
          }
        }}
      />
    );
  }

  return (
    <ScreenContainer>
      {activeTab === "dashboard" && (
        <DashboardScreen
          data={safeData}
          onOpenTodayWorkout={() => {
            const firstDayWithWork = safeData.training_days.find((d) =>
              safeData.prescriptions.some((p) => p.training_day_id === d.id),
            );
            setWorkoutDayIntent(firstDayWithWork?.id ?? null);
            setActiveTab("workouts");
          }}
          onOpenScheduledDay={(dayId) => {
            setWorkoutDayIntent(dayId);
            setActiveTab("workouts");
          }}
          onOpenSchedule={() => setActiveTab("schedule")}
        />
      )}
      {activeTab === "workouts" && (
        <WorkoutScreen
          data={safeData}
          selectedDayId={workoutDayIntent}
          onRebuildProgram={() => setCycleBuilderOpen(true)}
          onFinishWorkout={() => setActiveTab("dashboard")}
          onSaveExerciseLog={(log) => saveLog.mutateAsync(log)}
        />
      )}
      {activeTab === "progress" && <ProgressScreen data={safeData} />}
      {activeTab === "schedule" && (
        <ScheduleScreen
          data={safeData}
          onOpenDay={(dayId) => {
            setWorkoutDayIntent(dayId);
            setActiveTab("workouts");
          }}
        />
      )}
      {activeTab === "profile" && (
        <ProfileScreen
          data={safeData}
          smartPreset={smartPreset}
          onStartNewMesocycle={() => setCycleBuilderOpen(true)}
          onEndMesocycleEarly={async (input) => {
            await endMesocycleEarly.mutateAsync(input);
            setCycleBuilderOpen(true);
          }}
          onCreateExercise={async ({ name, muscle_group, equipment }) => {
            await createExercise.mutateAsync({ name, muscle_group, equipment });
          }}
          onLogout={async () => {
            await logoutSession();
            setSession(null);
          }}
        />
      )}

      {activeTab === "progress" && (
        <div className="mt-4">
          <CheckInScreen onSubmit={(checkin) => createCheckin.mutateAsync(checkin)} />
        </div>
      )}

      <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 justify-between border-t border-white/10 bg-[#111111]/95 px-4 py-3 backdrop-blur">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} type="button" className="flex flex-col items-center gap-1 text-xs" onClick={() => setActiveTab(tab.id)}>
              <Icon className={`h-5 w-5 ${active ? "text-lime" : "text-zinc-400"}`} />
              <span className={active ? "text-lime" : "text-zinc-400"}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </ScreenContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

function normalizeData(input: AppSeedData): AppSeedData {
  return {
    ...input,
    user: input.user ?? { id: "u1", first_name: "Athlete", experience_level: "Intermediate", onboarding_completed: false, preferred_units: "kg" },
    program: input.program ?? { id: "p1", days_per_week: 4, current_week: 1, mesocycle_length: 6, status: "active" },
    training_days: Array.isArray(input.training_days) ? input.training_days : [],
    volumes: Array.isArray(input.volumes) ? input.volumes : [],
    exercises: Array.isArray(input.exercises) ? input.exercises : [],
    prescriptions: Array.isArray(input.prescriptions) ? input.prescriptions : [],
    logs: Array.isArray(input.logs) ? input.logs : [],
    checkins: Array.isArray(input.checkins) ? input.checkins : [],
    mesocycle_history: Array.isArray(input.mesocycle_history) ? input.mesocycle_history : [],
  };
}

function buildSetupFromCurrentData(data: AppSeedData): ProgramSetupInput {
  return {
    experience_level: data.user.experience_level,
    days_per_week: data.program.days_per_week,
    mesocycle_length: data.program.mesocycle_length,
    split_preference: data.program.split_preference ?? "Auto",
    muscle_setups: data.volumes.map((v) => ({
      muscle_group: v.muscle_group,
      emphasis: v.is_focus ? "Emphasize" : "Grow",
      mev: v.mev,
      mrv: v.mrv,
      target_sets: v.current_volume,
    })),
    exercise_allocations: data.prescriptions.map((p) => {
      const ex = data.exercises.find((e) => e.id === p.exercise_id);
      return {
        exercise_id: p.exercise_id,
        muscle_group: ex?.muscle_group ?? "Chest",
        weekly_sets: p.sets,
      };
    }),
    exercise_model_overrides: Object.fromEntries(
      data.prescriptions.map((p) => [p.exercise_id, p.progression_model ?? "DoubleProgression"]),
    ),
    suggestion_decisions: data.program.suggestion_decisions ?? [],
    smart_aggressiveness: data.program.smart_aggressiveness ?? "Balanced",
    pro_settings: {
      progression_model: data.program.progression_model ?? "DoubleProgression",
      fatigue_sensitivity: "Moderate",
      rir_floor: 1,
      use_myoreps: false,
      deload_mode: "Auto",
      deload_week: data.program.deload_week ?? data.program.mesocycle_length,
      pain_protocol: "Moderate",
    },
  };
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; message: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: error instanceof Error ? error.message : "Unknown runtime error" };
  }

  componentDidCatch(error: unknown) {
    // Keep console output for debugging in browser devtools.
    // eslint-disable-next-line no-console
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto min-h-screen w-full max-w-md bg-appbg px-4 pt-8 text-white">
          <div className="rounded-3xl border border-red-400/50 bg-red-500/10 p-4">
            <p className="text-lg font-semibold text-red-300">App runtime error</p>
            <p className="mt-2 text-sm text-red-100">{this.state.message}</p>
            <p className="mt-2 text-xs text-zinc-300">Open browser console for full details. You can also run `localStorage.removeItem(\"hypertrophy-db-v1\")` and reload.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
