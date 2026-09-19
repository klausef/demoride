import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import { MapBackdrop } from "@/components/MapBackdrop";
import { Avatar, Rating } from "@/components/PersonCard";
import { peso } from "@/lib/glide";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Your Glide rides & earnings" },
      {
        name: "description",
        content:
          "See your upcoming Glide rides, track earnings, and rate your rider after each trip.",
      },
      { property: "og:title", content: "Dashboard — Your Glide rides & earnings" },
      {
        property: "og:description",
        content: "Upcoming rides, earnings, and rider ratings in one place.",
      },
    ],
  }),
  component: DashboardPage,
});

type RideRow = {
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
  rider?: { full_name: string; photo_url: string | null; rating_avg: number } | null;
};

function DashboardPage() {
  const { user, role, loading } = useAuth();
  const [rides, setRides] = useState<RideRow[]>([]);
  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());
  const [ratingFor, setRatingFor] = useState<RideRow | null>(null);
  const [stars, setStars] = useState(5);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const col = role === "rider" ? "rider_id" : "passenger_id";
      const { data } = await supabase
        .from("rides")
        .select("*, rider:profiles!rides_rider_id_fkey(full_name, photo_url, rating_avg)")
        .eq(col, user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (cancelled) return;
      setRides((data as unknown as RideRow[]) ?? []);
      const { data: ratings } = await supabase
        .from("ratings")
        .select("ride_id")
        .eq("rater_id", user.id);
      if (!cancelled) setRatedIds(new Set((ratings ?? []).map((r) => r.ride_id)));
    };
    void load();
    const t = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [user, role]);

  const upcoming = useMemo(
    () => rides.filter((r) => ["requested", "accepted", "ongoing"].includes(r.status)),
    [rides],
  );
  const completed = useMemo(() => rides.filter((r) => r.status === "completed"), [rides]);
  const earnings = useMemo(
    () =>
      role === "rider"
        ? completed.reduce((s, r) => s + (r.payment_status === "paid" ? r.fare_cents : 0), 0)
        : completed.reduce((s, r) => s + r.fare_cents, 0),
    [completed, role],
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

  if (loading) {
    return <main className="min-h-dvh bg-background" />;
  }

  if (!user) {
    return (
      <main className="relative grid min-h-dvh place-items-center bg-background px-6 font-body text-foreground">
        <MapBackdrop />
        <div className="glass-sheet relative z-10 w-full max-w-sm rounded-3xl p-6 text-center ring-1 ring-white/15">
          <h1 className="font-display text-xl font-bold">Your dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to see upcoming rides, earnings, and rate your rider.
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

      <div className="animate-rise absolute inset-x-0 bottom-0 top-0 z-20 overflow-y-auto pb-24 pt-6">
        <div className="mx-auto w-full max-w-md px-4">
          <h1 className="font-display text-2xl font-bold">
            {role === "rider" ? "Rider dashboard" : "Your dashboard"}
          </h1>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/50">
            {role === "rider" ? "earnings & upcoming trips" : "trips & ratings"}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Upcoming", value: String(upcoming.length) },
              { label: "Completed", value: String(completed.length) },
              {
                label: role === "rider" ? "Earned" : "Spent",
                value: peso(earnings),
              },
            ].map((s) => (
              <div key={s.label} className="glass-sheet rounded-2xl p-3 text-center ring-1 ring-white/15">
                <div className="font-display text-lg font-bold text-foreground">{s.value}</div>
                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-foreground/50">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/45">
            Upcoming rides
          </div>
          <div className="mt-2 space-y-1.5">
            {upcoming.length === 0 && (
              <div className="glass-sheet rounded-xl px-3 py-5 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/45 ring-1 ring-white/10">
                Nothing scheduled
              </div>
            )}
            {upcoming.map((r) => (
              <div key={r.id} className="glass-sheet rounded-xl p-3 ring-1 ring-white/15">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm font-bold uppercase text-foreground">
                    {r.service === "fetch" ? "Fetch errand" : r.service === "plus" ? "Moto Plus" : "Moto"}
                  </span>
                  <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-primary">
                    {r.status}
                  </span>
                </div>
                <div className="mt-1.5 space-y-0.5 font-mono text-[10px] text-foreground/60">
                  <div>PICKUP · {r.pickup_label}</div>
                  <div>DROP · {r.dropoff_label}</div>
                </div>
                <div className="mt-1 font-mono text-[10px] text-foreground/50">{peso(r.fare_cents)}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/45">
            {role === "rider" ? "Recent trips" : "Rate your rider"}
          </div>
          <div className="mt-2 space-y-1.5">
            {completed.length === 0 && (
              <div className="glass-sheet rounded-xl px-3 py-5 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/45 ring-1 ring-white/10">
                No completed trips yet
              </div>
            )}
            {completed.map((r) => (
              <div key={r.id} className="glass-sheet rounded-xl p-3 ring-1 ring-white/15">
                <div className="flex items-center gap-3">
                  {r.rider && <Avatar name={r.rider.full_name} photo={r.rider.photo_url} />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {r.rider?.full_name ?? "Ride"}
                    </div>
                    <div className="truncate font-mono text-[10px] text-foreground/50">
                      {r.dropoff_label} · {peso(r.fare_cents)}
                    </div>
                  </div>
                  {r.rider && <Rating avg={r.rider.rating_avg} />}
                </div>
                {role !== "rider" && r.rider_id && !ratedIds.has(r.id) && (
                  <button
                    onClick={() => {
                      setRatingFor(r);
                      setStars(5);
                    }}
                    className="mt-2.5 w-full rounded-xl bg-primary/15 py-2.5 font-display text-xs font-bold uppercase tracking-[0.08em] text-primary ring-1 ring-primary/30"
                  >
                    Rate this rider
                  </button>
                )}
                {ratedIds.has(r.id) && (
                  <div className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-foreground/40">
                    Rated — thanks!
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {ratingFor && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-background/70 px-6 backdrop-blur-sm">
          <div className="glass-sheet w-full max-w-sm rounded-3xl p-5 ring-1 ring-white/15">
            <div className="text-center font-display text-lg font-bold">
              Rate {ratingFor.rider?.full_name ?? "your rider"}
            </div>
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
