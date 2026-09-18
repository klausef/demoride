import { Link } from "@tanstack/react-router";
import { Bike, Home, Package } from "lucide-react";

const items = [
  { to: "/", label: "Ride", icon: Home },
  { to: "/activity", label: "Activity", icon: Package },
  { to: "/drive", label: "Drive", icon: Bike },
] as const;

export function BottomNav() {
  return (
    <nav className="absolute inset-x-3 bottom-3 z-40">
      <div className="glass-sheet flex items-center justify-between rounded-2xl px-2 py-2 ring-1 ring-white/15">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="grid flex-1 place-items-center rounded-xl py-1.5 text-muted-foreground transition-colors"
            activeProps={{ className: "text-primary bg-primary/10" }}
            activeOptions={{ exact: true }}
          >
            <Icon className="size-5" strokeWidth={2.2} />
            <span className="mt-0.5 font-display text-[10px] font-bold">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
