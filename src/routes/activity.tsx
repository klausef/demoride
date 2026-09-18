import { createFileRoute } from "@tanstack/react-router";
import { MapBackdrop } from "@/components/MapBackdrop";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity — Glide rides & errands" },
      {
        name: "description",
        content: "Every Glide motorcycle ride and fetch errand you've taken, with what it cost you.",
      },
      { property: "og:title", content: "Activity — Glide rides & errands" },
      {
        property: "og:description",
        content: "Every Glide motorcycle ride and fetch errand you've taken, with what it cost you.",
      },
    ],
  }),
  component: ActivityPage,
});

const history = [
  { code: "F", title: "Fetch · 2 iced coffees", when: "Today 09:12", detail: "Brew Lane → Home", cost: "$0.00 fee" },
  { code: "M", title: "Moto · Riverside Market", when: "Yesterday 18:40", detail: "Willow & 5th → Market", cost: "Free" },
  { code: "F", title: "Fetch · Parcel pickup", when: "Wed 14:05", detail: "Post hub → Office", cost: "$0.00 fee" },
  { code: "P", title: "Moto Plus · Airport run", when: "Mon 05:30", detail: "Home → Terminal 2", cost: "$1.80" },
];

function ActivityPage() {
  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-background font-body text-foreground">
      <MapBackdrop className="opacity-60" />

      <div className="relative z-10 px-4 pb-28 pt-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Activity</h1>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/45">
          4 trips · $1.80 spent all time
        </p>

        <div className="mt-5 space-y-1.5">
          {history.map((h) => (
            <div
              key={h.title + h.when}
              className="flex items-center gap-3 rounded-xl bg-card/50 px-3 py-3 ring-1 ring-white/10"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 font-display text-xs font-bold text-primary">
                {h.code}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{h.title}</div>
                <div className="truncate font-mono text-[10px] text-foreground/50">{h.detail}</div>
              </div>
              <div className="ml-auto shrink-0 text-right">
                <div className="font-display text-sm font-bold text-foreground">{h.cost}</div>
                <div className="font-mono text-[9px] text-foreground/40">{h.when}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
