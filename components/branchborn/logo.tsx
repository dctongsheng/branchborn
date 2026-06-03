import { Orbit } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 font-semibold tracking-tight text-stone-900">
      <span className="flex size-7 items-center justify-center rounded-full bg-stone-950 text-white">
        <Orbit className="size-4" />
      </span>
      {!compact && <span>Branchborn</span>}
    </div>
  );
}
