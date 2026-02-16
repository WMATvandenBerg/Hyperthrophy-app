import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44Client } from "../lib/base44";
import type { ExerciseLog, ProgramSetupInput, UserProfile, WeeklyCheckIn } from "../types/models";

export function useAppData() {
  return useQuery({
    queryKey: ["dashboard-data"],
    queryFn: () => base44Client.getDashboardData(),
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (setup: ProgramSetupInput) => base44Client.completeOnboarding(setup),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard-data"] }),
  });
}

export function useSetAuthenticatedUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user: Partial<UserProfile>) => base44Client.setAuthenticatedUser(user),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard-data"] }),
  });
}

export function useStartNewMesocycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (setup: ProgramSetupInput) => base44Client.startNewMesocycle(setup),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard-data"] }),
  });
}

export function useCreateCustomExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: base44Client.createCustomExercise,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard-data"] }),
  });
}

export function useSaveExerciseLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (log: ExerciseLog) => base44Client.saveExerciseLog(log),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard-data"] }),
  });
}

export function useCreateCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (checkin: WeeklyCheckIn) => base44Client.createCheckin(checkin),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard-data"] }),
  });
}
