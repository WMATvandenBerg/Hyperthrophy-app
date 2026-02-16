import { motion } from "framer-motion";
import type { PropsWithChildren, ReactNode } from "react";
import { CircleMinus, CirclePlus } from "lucide-react";

export function AppCard({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <div className={`rounded-3xl bg-surface p-4 shadow-soft ${className}`}>{children}</div>;
}

export function PrimaryButton({
  children,
  onClick,
  className = "",
  type = "button",
  disabled,
}: PropsWithChildren<{ onClick?: () => void; className?: string; type?: "button" | "submit"; disabled?: boolean }>) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-full bg-lime px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#c5ef4f] disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, className = "" }: PropsWithChildren<{ onClick?: () => void; className?: string }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-full border border-white/20 bg-surface2 px-5 py-3 text-sm text-white transition hover:border-lime ${className}`}
    >
      {children}
    </button>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border-2 border-white/10 bg-surface2 px-4 py-3 text-white outline-none transition focus:border-lime"
    />
  );
}

export function ScreenContainer({ children, hideNav = false }: PropsWithChildren<{ hideNav?: boolean }>) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-appbg px-4 pt-4 text-white">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <div className={hideNav ? "pb-8" : "pb-24"}>{children}</div>
      </motion.div>
    </div>
  );
}

export function NumberStepper({
  value,
  onChange,
  step = 1,
  label,
  allowTyped = false,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  label: string;
  allowTyped?: boolean;
}) {
  return (
    <div className="rounded-2xl border-2 border-white/10 bg-surface2 p-3">
      <p className="mb-2 text-xs text-zinc-400">{label}</p>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onChange(Math.max(0, value - step))}>
          <CircleMinus className="h-8 w-8 text-lime" />
        </button>
        {allowTyped ? (
          <input
            type="number"
            value={value}
            step={step}
            min={0}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
            className="w-24 rounded-xl border border-white/10 bg-appbg px-2 py-1 text-center text-2xl font-semibold text-white outline-none focus:border-lime"
          />
        ) : (
          <span className="text-2xl font-semibold">{value}</span>
        )}
        <button type="button" onClick={() => onChange(value + step)}>
          <CirclePlus className="h-8 w-8 text-lime" />
        </button>
      </div>
    </div>
  );
}

export function SelectChip({
  label,
  selected,
  onClick,
  icon,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl border-2 px-4 py-3 text-left transition ${
        selected ? "border-lime bg-lime/10" : "border-white/10 bg-surface2"
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
