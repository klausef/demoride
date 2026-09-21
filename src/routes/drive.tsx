import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MapBackdrop } from "@/components/MapBackdrop";
import { BottomNav } from "@/components/BottomNav";
import { Avatar, Rating } from "@/components/PersonCard";
import { useAuth } from "@/lib/auth";
import { getPosition, peso } from "@/lib/glide";

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

type Passenger = {
  full_name: string;
  photo_url: string | null;
  rating_avg: number;
  rating_count: number;
} | null;

type Ride = {
  id: string;
  service: "moto" | "fetch" | "plus";
  status: "requested" | "accepted" | "ongoing" | "completed" | "cancelled";
  pickup_label: string;
  dropoff_label: string;
  errand_note: string | null;
  fare_cents: number;
  payment_method: "gcash" | "cash";
  payment_status: "unpaid" | "paid";
  created_at: string;
  completed_at: string | null;
  passenger_id: string;
  rider_id: string | null;
  passenger?: Passenger;
};

const SELECT =
  "*, passenger:profiles!rides_passenger_id_fkey(full_name, photo_url, rating_avg, rating_count)";

const serviceName = (s: Ride["service"]) =>
  s === "fetch" ? "Fetch errand" : s === "plus" ? "Moto Plus" : "Moto";

function DrivePage() {
  const { user, profile, role, loading, refresh } = useAuth();
  const [online, setOnline] = useState(false);
  const [queue, setQueue] = useState<Ride[]>([]);
  const [mine, setMine] = useState<Ride[]>([]);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) setOnline(profile.is_online);
  }, [profile]);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: open }, { data: own }] = await Promise.all([
      supabase
        .from("rides")
        .select(SELECT)
        .eq("status", "requested")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("rides")
        .select(SELECT)
        .eq("rider_id", user.id)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);
    setQueue(((open as unknown as Ride[]) ?? []).filter((r) => r.passenger_id !== user.id));
    setMine((own as unknown as Ride[]) ?? []);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void load();
    const t = setInterval(() => void load(), 6000);
    return () => clearInterval(t);
  }, [user, load]);

  const active = useMemo(
    () => mine.filter((r) => ["accepted", "ongoing"].includes(r.status)),
    [mine],
  );
  const today = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const done = mine.filter(
      (r) => r.status === "completed" && new Date(r.completed_at ?? r.created_at) >= start,
    );
    return {
      trips: done.length,
      earned: done.reduce((s, r) => s + (r.payment_status === "paid" ? r.fare_cents : 0), 0),
    };
  }, [mine]);

  const toggleOnline = async () => {
    if (!user) return;
    const next = !online;
    setOnline(next);
    const pos = next ? await getPosition() : null;
    await supabase
      .from("profiles")
      .update({
        is_online: next,
        ...(pos ? { current_lat: pos.lat, current_lng: pos.lng } : {}),
      })
      .eq("id", user.id);
    void refresh();
  };

  const accept = async (ride: Ride) => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("rides")
      .update({ rider_id: user.id, status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", ride.id)
      .eq("status", "requested");
    setBusy(false);
    if (error) {
      toast.error("That request was already taken.");
    } else {
      toast.success("Ride accepted — head to the pickup point.");
    }
    void load();
  };

  const setStatus = async (ride: Ride, status: "ongoing" | "completed") => {
    setBusy(true);
    await supabase
      .from("rides")
      .update({
        status,
        ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq("id", ride.id);
    setBusy(false);
    void load();
  };

  if (loading) return <main className="min-h-dvh bg-background" />;

  if (!user) {
    return (
      <main className="relative grid min-h-dvh place-items-center bg-background px-6 font-body text-foreground">
        <MapBackdrop />
        <div className="glass-sheet relative z-10 w-full max-w-sm rounded-3xl p-6 text-center ring-1 ring-white/15">
          <h1 className="font-display text-xl font-bold">Drive with FETCH</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in as a motorcycle rider to go online and take requests.
          </p>
          <Link
            to="/auth"
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary py-3 font-display text-sm font-bold uppercase tracking-[0.08em] text-primary-foreground"
          >
            Sign in
          </Link>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-background font-body text-foreground">
      <MapBackdrop />

      <div className="absolute left-3 top-3 z-10 rounded-md bg-card/70 px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-foreground/60 ring-1 ring-white/10">
        <div className="flex items-center gap-1.5">
          <span
            className={`size-1.5 rounded-full ${online ? "animate-pulse bg-primary" : "bg-foreground/30"}`}
          />
          {online ? "ONLINE · TAKING REQUESTS" : "OFFLINE"}
        </div>
      </div>

      <div className="animate-rise absolute inset-x-0 bottom-0 top-16 z-20 overflow-y-auto pb-24">
        <div className="mx-auto w-full max-w-md px-4">
          <div className="glass-sheet rounded-2xl p-4 ring-1 ring-white/15">
            <button
              type="button"
              onClick={toggleOnline}
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

            {role !== "rider" && (
              <p className="mt-2 rounded-lg bg-primary/10 px-3 py-2 font-mono text-[10px] text-primary">
                Your account is set up as a passenger — rider requests may not appear.
              </p>
            )}

            {active.length > 0 && (
              <>
                <div className="mt-4 font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/45">
                  Current trip
                </div>
                <div className="mt-2 space-y-1.5">
                  {active.map((r) => (
                    <div key={r.id} className="rounded-xl bg-card/50 p-3 ring-1 ring-primary/30">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={r.passenger?.full_name ?? "Passenger"}
                          url={r.passenger?.photo_url ?? null}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {r.passenger?.full_name ?? "Passenger"}
                          </div>
                          <div className="font-mono text-[10px] text-foreground/50">
                            {serviceName(r.service)} · {peso(r.fare_cents)} · {r.payment_method}
                          </div>
                        </div>
                        <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-[9px] uppercase text-primary">
                          {r.status}
                        </span>
                      </div>
                      <div className="mt-2 space-y-0.5 font-mono text-[10px] text-foreground/60">
                        <div>PICKUP · {r.pickup_label}</div>
                        <div>DROP · {r.dropoff_label}</div>
                        {r.errand_note && <div>ERRAND · {r.errand_note}</div>}
                      </div>
                      <button
                        disabled={busy}
                        onClick={() => setStatus(r, r.status === "accepted" ? "ongoing" : "completed")}
                        className="mt-2.5 w-full rounded-xl bg-primary py-3 font-display text-sm font-bold uppercase tracking-[0.08em] text-primary-foreground disabled:opacity-50"
                      >
                        {r.status === "accepted" ? "Start trip" : "Complete trip"}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="mt-4 flex items-center justify-between px-1">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/45">
                Incoming requests
              </span>
              <span className="font-mono text-[9px] text-foreground/40">
                {queue.filter((r) => !skipped.has(r.id)).length} waiting
              </span>
            </div>

            <div className="mt-2 space-y-1.5">
              {online && queue.filter((r) => !skipped.has(r.id)).length > 0 ? (
                queue
                  .filter((r) => !skipped.has(r.id))
                  .map((r) => (
                    <div key={r.id} className="rounded-xl bg-card/50 p-3 ring-1 ring-primary/25">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={r.passenger?.full_name ?? "Passenger"}
                          url={r.passenger?.photo_url ?? null}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {r.passenger?.full_name ?? "Passenger"}
                          </div>
                          <div className="flex items-center gap-2">
                            <Rating
                              value={r.passenger?.rating_avg ?? 5}
                              count={r.passenger?.rating_count ?? 0}
                            />
                            <span className="font-mono text-[10px] text-foreground/45">
                              {serviceName(r.service)}
                            </span>
                          </div>
                        </div>
                        <span className="font-display text-sm font-bold text-foreground">
                          {peso(r.fare_cents)}
                        </span>
                      </div>
                      <div className="mt-2.5 space-y-1 font-mono text-[10px] text-foreground/60">
                        <div>PICKUP · {r.pickup_label}</div>
                        <div>DROP · {r.dropoff_label}</div>
                        {r.errand_note && <div>ERRAND · {r.errand_note}</div>}
                      </div>
                      <div className="mt-2.5 grid grid-cols-[1fr_2fr] gap-1.5">
                        <button
                          onClick={() => setSkipped((s) => new Set(s).add(r.id))}
                          className="rounded-xl bg-foreground/10 py-3 font-display text-sm font-bold text-foreground ring-1 ring-white/10"
                        >
                          Skip
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => accept(r)}
                          className="rounded-xl bg-primary py-3 font-display text-sm font-bold uppercase tracking-[0.08em] text-primary-foreground disabled:opacity-50"
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
              <span>
                Today · {today.trips} trips · {peso(today.earned)} kept
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1 rounded-full bg-primary" /> no fees
              </span>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
