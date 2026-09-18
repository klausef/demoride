import { cn } from "@/lib/utils";

/** Full-bleed kinetic night map with grid, roads, glow, and an optional pickup pin. */
export function MapBackdrop({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("map-grid absolute inset-0 overflow-hidden", className)}>
      {/* roads */}
      <div className="absolute left-0 top-[190px] h-[3px] w-full bg-gradient-to-r from-transparent via-foreground/30 to-transparent" />
      <div className="absolute left-0 top-[300px] h-[3px] w-full rotate-[8deg] bg-gradient-to-r from-transparent via-foreground/30 to-transparent" />
      <div
        className="absolute left-[60%] top-0 h-full w-[3px] -rotate-[6deg]"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(170,190,235,.4), transparent)",
        }}
      />
      <div
        className="absolute left-[22%] top-0 h-full w-[2px] rotate-[4deg]"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(170,190,235,.28), transparent)",
        }}
      />
      {/* top fade for legibility */}
      <div
        className="absolute left-0 top-0 h-40 w-full"
        style={{ background: "linear-gradient(180deg, rgba(6,9,16,.9), transparent)" }}
      />
      {children}
    </div>
  );
}

/** Signature pickup pin: drops in with a bounce and pulses. */
export function PickupPin({ className }: { className?: string }) {
  return (
    <div className={cn("absolute z-10 -translate-x-1/2", className)}>
      <div className="animate-pin">
        <div className="relative flex size-9 items-center justify-center rounded-full bg-primary shadow-[0_0_0_6px_rgba(255,106,43,0.18)]">
          <span className="animate-pulse-ring pointer-events-none absolute inset-0 rounded-full bg-primary/50" />
          <div className="size-3.5 rounded-full bg-white/90" />
        </div>
        <div className="mx-auto h-3 w-px bg-primary/60" />
      </div>
    </div>
  );
}

/** Incoming rider chip that glides in from the left. */
export function RiderChip({
  name,
  detail,
  className,
}: {
  name: string;
  detail: string;
  className?: string;
}) {
  return (
    <div className={cn("animate-glide absolute z-10", className)}>
      <div className="flex items-center gap-2 rounded-full bg-foreground py-1.5 pl-1.5 pr-3 shadow-lg ring-1 ring-black/10">
        <div className="flex size-7 items-center justify-center rounded-full bg-card font-display text-[11px] font-bold text-foreground">
          {name.charAt(0)}
        </div>
        <div className="leading-none">
          <div className="text-[11px] font-semibold text-card">{name}</div>
          <div className="mt-0.5 font-mono text-[9px] text-card/60">{detail}</div>
        </div>
      </div>
    </div>
  );
}

/** Radar sweep shown while searching for a rider. */
export function SearchRadar({ className }: { className?: string }) {
  return (
    <div className={cn("absolute z-10 -translate-x-1/2", className)}>
      <div className="relative flex size-24 items-center justify-center">
        <div
          className="animate-scan absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(255,106,43,0.5), transparent 90deg)",
          }}
        />
        <div className="absolute inset-3 rounded-full border border-foreground/15" />
        <div className="absolute inset-7 rounded-full border border-foreground/10" />
        <div className="size-3 rounded-full bg-primary shadow-[0_0_12px_rgba(255,106,43,0.9)]" />
      </div>
    </div>
  );
}
