import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapBackdrop, PickupPin } from "@/components/MapBackdrop";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/drive")({
  head: () => ({
    meta: [
      { title: "Drive — Take FETCH rides & errands" },
      {
        name: "description",
        content:
          "Go online on your motorcycle, accept nearby ride and fetch requests, and keep every peso you earn. No commission.",
      },
      { property: "og:title", content: "Drive — Take FETCH rides & errands" },
      {
        property: "og:description",
        content: "Go online, accept nearby rides and errands, and keep everything you earn.",
      },
    ],
  }),
  component: DrivePage,
});

const incoming = [
  {
    code: "F",
    title: "Fetch · Pharmacy run",
    pickup: "MedPlus, 8th Ave",
    drop: "Cedar Apartments",
    meta: "1.4 mi · 9 min",
  },
  {
    code: "M",
    title: "Moto · Riverside Market",
    pickup: "Willow & 5th",
    drop: "Riverside Market",
    meta: "2.1 mi · 6 min",
  },
];

function DrivePage() {
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState(incoming);

  const dismiss = (title: string) => setQueue((q) => q.filter((i) => i.title !== title));

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-background font-body text-foreground">
      <MapBackdrop>
        <PickupPin className="left-1/2 top-[150px]" />
      </MapBackdrop>

      <div className="absolute left-3 top-3 z-10 rounded-md bg-card/70 px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-foreground/60 ring-1 ring-white/10">
        <div className="flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${online ? "animate-pulse bg-primary" : "bg-foreground/30"}`} />
          {online ? "ONLINE · TAKING REQUESTS" : "OFFLINE"}
        </div>
      </div>

      <div className="animate-rise absolute inset-x-0 bottom-0 z-20 pb-[68px]">
        <div
          className="glass-sheet rounded-t-[26px] p-4 pt-3 ring-1 ring-white/15"
          style={{ clipPath: "polygon(0 0, 100% 18%, 100% 100%, 0 100%)" }}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />

          <button
            type="button"
            onClick={() => setOnline((v) => !v)}
            className="flex w-full items-center gap-3 rounded-xl bg-card/50 px-3 py-3 text-left ring-1 ring-white/10"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">
                {online ? "You're online" : "Go online"}
              </div>
              <div className="font-mono text-[10px] text-foreground/50">
                0% commission · you keep every fare
              </div>
            </div>
            <span
              className={`ml-auto flex h-7 w-12 shrink-0 items-center rounded-full px-1 transition-colors ${
                online ? "bg-primary/40" : "bg-foreground/15"
              }`}
            >
              <span
                className={`size-5 rounded-full bg-foreground transition-transform ${
                  online ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </span>
          </button>

          <div className="mt-3.5 flex items-center justify-between px-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/45">
              Incoming requests
            </span>
            <span className="font-mono text-[9px] text-foreground/40">{queue.length} waiting</span>
          </div>

          <div className="mt-2 space-y-1.5">
            {online && queue.length > 0 ? (
              queue.map((r) => (
                <div key={r.title} className="rounded-xl bg-card/50 p-3 ring-1 ring-primary/25">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-primary/20 font-display text-xs font-bold text-primary">
                      {r.code}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">{r.title}</div>
                      <div className="truncate font-mono text-[10px] text-foreground/50">{r.meta}</div>
                    </div>
                  </div>
                  <div className="mt-2.5 space-y-1 font-mono text-[10px] text-foreground/60">
                    <div>PICKUP · {r.pickup}</div>
                    <div>DROP · {r.drop}</div>
                  </div>
                  <div className="mt-2.5 grid grid-cols-[1fr_2fr] gap-1.5">
                    <button
                      onClick={() => dismiss(r.title)}
                      className="rounded-xl bg-foreground/10 py-3 font-display text-sm font-bold text-foreground ring-1 ring-white/10"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => dismiss(r.title)}
                      className="rounded-xl bg-primary py-3 font-display text-sm font-bold uppercase tracking-[0.08em] text-primary-foreground"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-card/40 px-3 py-6 text-center ring-1 ring-white/10">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/45">
                  {online ? "Waiting for the next request" : "You're offline"}
                </div>
              </div>
            )}
          </div>

          <div className="mt-2.5 flex items-center justify-between px-1 font-mono text-[9px] text-foreground/40">
            <span>Today · 6 trips · $14.20 kept</span>
            <span className="flex items-center gap-1">
              <span className="size-1 rounded-full bg-primary" /> no fees
            </span>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
