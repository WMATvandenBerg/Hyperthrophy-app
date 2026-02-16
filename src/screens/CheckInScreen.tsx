import { Moon, ShieldAlert, SmilePlus, Thermometer, Zap } from "lucide-react";
import { useState } from "react";
import { AppCard, PrimaryButton, SecondaryButton } from "../components/ui";
import type { WeeklyCheckIn } from "../types/models";

const questions = [
  { key: "fatigue", label: "Fatigue", icon: Thermometer },
  { key: "soreness", label: "Soreness", icon: ShieldAlert },
  { key: "sleep", label: "Sleep", icon: Moon },
  { key: "motivation", label: "Motivation", icon: SmilePlus },
  { key: "stress", label: "Stress", icon: Zap },
] as const;

type CheckInValues = Record<(typeof questions)[number]["key"], number>;

export function CheckInScreen({ onSubmit }: { onSubmit: (checkin: WeeklyCheckIn) => Promise<unknown> }) {
  const [step, setStep] = useState(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState<CheckInValues>({ fatigue: 5, soreness: 5, sleep: 7, motivation: 8, stress: 4 });

  const isNotesStep = step === questions.length;
  const current = questions[Math.min(step, questions.length - 1)];
  const Icon = current.icon;

  const handleContinue = async () => {
    if (!isNotesStep) {
      setStep((s) => Math.min(questions.length, s + 1));
      return;
    }

    setSubmitting(true);
    await onSubmit({
      id: `c${Date.now()}`,
      fatigue_level: values.fatigue,
      soreness_level: values.soreness,
      sleep_quality: values.sleep,
      motivation_level: values.motivation,
      stress_level: values.stress,
      notes,
      created_at: new Date().toISOString(),
    });
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Weekly Check-In</h1>
      <div className="flex gap-2">
        {Array.from({ length: questions.length + 1 }).map((_, i) => (
          <div key={i} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-lime" : "bg-surface2"}`} />
        ))}
      </div>

      {!isNotesStep ? (
        <AppCard className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-lime text-black">
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-lg font-semibold">{current.label}</p>
          </div>
          <p className="text-center text-5xl font-bold">{values[current.key]}</p>
          <input
            className="slider w-full"
            type="range"
            min={1}
            max={10}
            value={values[current.key]}
            onChange={(e) => setValues((v) => ({ ...v, [current.key]: Number(e.target.value) }))}
          />
        </AppCard>
      ) : (
        <AppCard className="space-y-3">
          <p className="text-sm text-zinc-400">Add notes</p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="h-40 w-full rounded-2xl border-2 border-white/10 bg-surface2 p-3 text-white outline-none focus:border-lime" placeholder="How did this week feel?" />
          {submitted && <p className="text-sm text-lime">Check-in saved.</p>}
        </AppCard>
      )}

      <div className="flex gap-3">
        <SecondaryButton onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</SecondaryButton>
        <PrimaryButton onClick={handleContinue}>
          {submitting ? "Submitting..." : isNotesStep ? "Submit" : "Continue"}
        </PrimaryButton>
      </div>
    </div>
  );
}
