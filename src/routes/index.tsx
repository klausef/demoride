import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapBackdrop, PickupPin, RiderChip, SearchRadar } from "@/components/MapBackdrop";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Glide — Free motorcycle rides & errands" },
      {
        name: "description",
        content:
          "Book a free motorcycle ride or send a rider to fetch food, parcels, or anything you need. Free for riders and drivers.",
      },
      { property: "og:title", content: "Glide — Free motorcycle rides & errands" },
      {
        property: "og:description",
        content:
          "Book a free motorcycle ride or send a rider to fetch food, parcels, or anything you need.",
      },
    ],
  }),
  component: RideHome,
});

type Service = "moto" | "fetch" | "pillion";
type Phase = "idle" | "searching" | "matched";

const services: {
  id: Service;
  code: string;
  name: string;
  meta: string;
  price: string;
  free: boolean;
}[] = [
  { id: "moto", code: "M", name: "Moto", meta: "solo · 3 min", price: "$0.00", free: true },
  {
    id: "fetch",
    code: "F",
    name: "Fetch anything",
    meta: "errand · 6 min",
    price: "$0.00",
    free: true,
  },
  { id: "pillion", code: "P", name: "Moto Plus", meta: "helmet + box · 5 min", price: "$1.80", free: false },
];

function RideHome() {
  const [service, setService] = useState<Service>("moto");
  const [phase, setPhase] = useState<Phase>("idle");
  const [pickup, setPickup] = useState("Willow & 5th");
  const [drop, setDrop] = useState("Riverside Market");
  const [errand, setErrand] = useState("");

  useEffect(() => {
    if (phase !== "searching") return;
    const t = setTimeout(() => setPhase("matched"), 2600);
    return () => clearTimeout(t);
  }, [phase]);

  const isFetch = service === "fetch";

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-background font-body text-foreground">
      <MapBackdrop>
        {phase === "searching" ? (
          <SearchRadar className="left-1/2 top-[150px]" />
        ) : (
          <PickupPin className="left-1/2 top-[150px]" />
        )}
        {phase === "matched" && (
          <RiderChip name="Marcus" detail="2.1 mi · eta 4m" className="left-[14%] top-[240px]" />
        )}
      </MapBackdrop>

      {/* live readout */}
      <div className="absolute left-3 top-3 z-10 rounded-md bg-card/70 px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-foreground/60 ring-1 ring-white/10">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          LIVE&nbsp;&nbsp;40.7128°N&nbsp;74.0060°W
        </div>
      </div>

      {/* status chip */}
      <div className="animate-rise absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full bg-card/70 px-3 py-1.5 ring-1 ring-white/10">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/50">
          {phase === "idle" ? "12 riders near" : phase === "searching" ? "Finding rider" : "Rider matched"}
        </span>
      </div>

      {/* bottom sheet */}
      <div className="animate-rise absolute inset-x-0 bottom-0 z-20 pb-[68px]">
        <div
          className="glass-sheet rounded-t-[26px] p-4 pt-3 ring-1 ring-white/15"
          style={{ clipPath: "polygon(0 0, 100% 18%, 100% 100%, 0 100%)" }}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />

          {phase === "matched" ? (
            <MatchedPanel isFetch={isFetch} onCancel={() => setPhase("idle")} />
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2.5 rounded-xl bg-card/50 px-3 py-2.5 ring-1 ring-white/10">
                  <span className="size-2 shrink-0 rounded-full bg-foreground" />
                  <input
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    className="w-full bg-transparent text-sm text-foreground/80 outline-none placeholder:text-muted-foreground"
                    placeholder="Pickup point"
                  />
                  <span className="ml-auto shrink-0 font-mono text-[9px] text-foreground/40">
                    PICKUP
                  </span>
                </label>
                <label className="flex items-center gap-2.5 rounded-xl bg-card/50 px-3 py-2.5 ring-1 ring-white/10">
                  <span className="size-2 shrink-0 rounded-full border-2 border-primary" />
                  <input
                    value={drop}
                    onChange={(e) => setDrop(e.target.value)}
                    className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                    placeholder={isFetch ? "Where to fetch from" : "Where to"}
                  />
                  <span className="ml-auto shrink-0 font-mono text-[9px] text-foreground/40">
                    {isFetch ? "STORE" : "DROP"}
                  </span>
                </label>
                {isFetch && (
                  <label className="flex items-start gap-2.5 rounded-xl bg-card/50 px-3 py-2.5 ring-1 ring-primary/30">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    <textarea
                      value={errand}
                      onChange={(e) => setErrand(e.target.value)}
                      rows={2}
                      className="w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      placeholder="What should your rider fetch? e.g. 2 iced coffees, pay a bill, pick up a parcel"
                    />
                  </label>
                )}
              </div>

              <div className="mt-3.5 flex items-center justify-between px-1">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/45">
                  Choose service
                </span>
                <span className="font-mono text-[9px] text-foreground/40">
                  {isFetch ? "(f) fetch" : "(m) ride"}
                </span>
              </div>

              <div className="mt-2 space-y-1.5">
                {services.map((s) => {
                  const active = s.id === service;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setService(s.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        active
                          ? "bg-primary/15 ring-1 ring-primary/40"
                          : "bg-card/40 ring-1 ring-white/10"
                      }`}
                    >
                      <span
                        className={`flex size-8 items-center justify-center rounded-lg font-display text-xs font-bold ${
                          active ? "bg-primary/20 text-primary" : "bg-foreground/10 text-foreground"
                        }`}
                      >
                        {s.code}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          {s.name}
                          {s.free && (
                            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-primary-foreground">
                              Free
                            </span>
                          )}
                        </span>
                        <span className="block font-mono text-[10px] text-foreground/50">
                          {s.meta}
                        </span>
                      </span>
                      <span className="ml-auto font-display text-base font-bold text-foreground">
                        {s.price}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={phase === "searching"}
                onClick={() => setPhase("searching")}
                className="relative mt-3.5 h-14 w-full overflow-hidden rounded-2xl bg-primary disabled:opacity-80"
              >
                <span className="relative z-10 font-display text-base font-bold uppercase tracking-[0.08em] text-primary-foreground">
                  {phase === "searching"
                    ? "Finding a rider…"
                    : isFetch
                      ? "Send a rider"
                      : "Request free ride"}
                </span>
                <span className="animate-pulse-ring pointer-events-none absolute right-6 top-1/2 size-8 -translate-y-1/2 rounded-full bg-white/40" />
              </button>

              <div className="mt-2.5 flex items-center justify-between px-1 font-mono text-[9px] text-foreground/40">
                <span>Free for you &amp; your rider</span>
                <span className="flex items-center gap-1">
                  <span className="size-1 rounded-full bg-primary" /> online
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}

function MatchedPanel({ isFetch, onCancel }: { isFetch: boolean; onCancel: () => void }) {
  return (
    <div>
      <div className="flex items-center gap-3 rounded-xl bg-card/50 px-3 py-3 ring-1 ring-white/10">
        <div className="flex size-11 items-center justify-center rounded-full bg-primary/20 font-display text-base font-bold text-primary">
          M
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">Marcus Dela Cruz</div>
          <div className="font-mono text-[10px] text-foreground/50">
            Honda Click 160 · NVK 284 · 4.97
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="font-display text-xl font-bold text-primary">4m</div>
          <div className="font-mono text-[9px] text-foreground/40">arriving</div>
        </div>
      </div>

      <div className="mt-2 rounded-xl bg-card/40 px-3 py-2.5 ring-1 ring-white/10">
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/45">
          {isFetch ? "Errand" : "Trip"}
        </div>
        <div className="mt-1 text-sm text-foreground/80">
          {isFetch
            ? "Rider will buy your items and deliver them to you. You pay only the item cost."
            : "Helmet provided. Meet your rider at the pin on the corner."}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button className="rounded-xl bg-foreground/10 py-3 font-display text-sm font-bold text-foreground ring-1 ring-white/10">
          Message
        </button>
        <button className="rounded-xl bg-foreground/10 py-3 font-display text-sm font-bold text-foreground ring-1 ring-white/10">
          Call
        </button>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="mt-1.5 h-12 w-full rounded-2xl bg-destructive/15 font-display text-sm font-bold uppercase tracking-[0.08em] text-destructive ring-1 ring-destructive/30"
      >
        Cancel request
      </button>
    </div>
  );
}
