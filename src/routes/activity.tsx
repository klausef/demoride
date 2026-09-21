import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MapBackdrop } from "@/components/MapBackdrop";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { peso } from "@/lib/glide";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity — FETCH rides & errands" },
      {
        name: "description",
        content: "Every FETCH motorcycle ride and fetch errand you've taken, with what it cost you.",
      },
      { property: "og:title", content: "Activity — FETCH rides & errands" },
      {
        property: "og:description",
        content: "Every FETCH motorcycle ride and fetch errand you've taken, with what it cost you.",
      },
    ],
  }),
  component: ActivityPage,
});

type Ride = {
  id: string;
  service: "moto" | "fetch" | "plus";
  status: "requested" | "accepted" | "ongoing" | "completed" | "cancelled";
  pickup_label: string;
  dropoff_label: string;
  fare_cents: number;
  payment_status: "unpaid" | "paid";
  created_at: string;
  rider_id: string | null;
  passenger_id: string;
};

const code = (s: Ride["service"]) => (s === "fetch" ? "F" : s === "plus" ? "P" : "M");
const label = (s: Ride["service"]) =>
  s === "fetch" ? "Fetch errand" : s === "plus" ? "Moto Plus" : "Moto";

function when(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d >= today
    ? `Today ${time}`
    : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

function ActivityPage() {
  const { user, role, loading } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());
  const [ratingFor, setRatingFor] = useState<Ride | null>(null);
  const [stars, setStars] = useState(5);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const col = role === "rider" ? "rider_id" : "passenger_id";
    const { data } = await supabase
      .from("rides")
      .select("*")
      .eq(col, user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setRides((data as unknown as Ride[]) ?? []);
    const { data: ratings } = await supabase
      .from("ratings")
      .select("ride_id")
      .eq("rater_id", user.id);
    setRatedIds(new Set((ratings ?? []).map((r) => r.ride_id)));
  }, [user, role]);

  useEffect(() => {
    if (!user) return;
    void load();
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [user, load]);

  const total = useMemo(
    () => rides.filter((r) => r.status === "completed").reduce((s, r) => s + r.fare_cents, 0),
    [rides],
  );

  const submitRating = async () => {
    if (!user || !ratingFor?.rider_id) return;
    setBusy(true);
    await supabase.from("ratings").insert({
      ride_id: ratingFor.id,
      rider_id: ratingFor.rider_id,
      rater_id: user.id,
      stars,
    });
    setRatedIds((s) => new Set(s).add(ratingFor.id));
    setRatingFor(null);
    setBusy(false);
  };

  if (loading) return <main className="min-h-dvh bg-background" />;

  if (!user) {
    return (
      <main className="relative grid min-h-dvh place-items-center bg-background px-6 font-body text-foreground">
        <MapBackdrop className="opacity-60" />
        <div className="glass-sheet relative z-10 w-full max-w-sm rounded-3xl p-6 text-center ring-1 ring-white/15">
          <h1 className="font-display text-xl font-bold">Your activity</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to see your rides and errands.
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
      <MapBackdrop className="opacity-60" />

      <div className="relative z-10 mx-auto w-full max-w-md px-4 pb-28 pt-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Activity</h1>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/45">
          {rides.length} trips · {peso(total)} {role === "rider" ? "earned" : "spent"} all time
        </p>

        <div className="mt-5 space-y-1.5">
          {rides.length === 0 && (
            <div className="rounded-xl bg-card/40 px-3 py-8 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/45 ring-1 ring-white/10">
              No trips yet
            </div>
          )}
          {rides.map((h) => (
            <div key={h.id} className="rounded-xl bg-card/50 px-3 py-3 ring-1 ring-white/10">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 font-display text-xs font-bold text-primary">
                  {code(h.service)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {label(h.service)} · {h.status}
                  </div>
                  <div className="truncate font-mono text-[10px] text-foreground/50">
                    {h.pickup_label} → {h.dropoff_label}
                  </div>
                </div>
                <div className="ml-auto shrink-0 text-right">
                  <div className="font-display text-sm font-bold text-foreground">
                    {peso(h.fare_cents)}
                  </div>
                  <div className="font-mono text-[9px] text-foreground/40">{when(h.created_at)}</div>
                </div>
              </div>
              {role !== "rider" &&
                h.status === "completed" &&
                h.rider_id &&
                !ratedIds.has(h.id) && (
                  <button
                    onClick={() => {
                      setRatingFor(h);
                      setStars(5);
                    }}
                    className="mt-2.5 w-full rounded-xl bg-primary/15 py-2.5 font-display text-xs font-bold uppercase tracking-[0.08em] text-primary ring-1 ring-primary/30"
                  >
                    Rate your rider
                  </button>
                )}
            </div>
          ))}
        </div>
      </div>

      {ratingFor && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-background/70 px-6 backdrop-blur-sm">
          <div className="glass-sheet w-full max-w-sm rounded-3xl p-5 ring-1 ring-white/15">
            <div className="text-center font-display text-lg font-bold">Rate your rider</div>
            <div className="mt-3 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setStars(n)} aria-label={`${n} stars`}>
                  <Star
                    className={`size-8 ${n <= stars ? "fill-primary text-primary" : "text-foreground/25"}`}
                  />
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setRatingFor(null)}
                className="rounded-xl bg-foreground/10 py-3 font-display text-sm font-bold text-foreground ring-1 ring-white/10"
              >
                Later
              </button>
              <button
                onClick={submitRating}
                disabled={busy}
                className="rounded-xl bg-primary py-3 font-display text-sm font-bold uppercase tracking-[0.08em] text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Saving…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
