import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RideMap, type LatLng } from "@/components/RideMap";
import { BottomNav } from "@/components/BottomNav";
import { PersonRow } from "@/components/PersonCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/lib/auth";
import { BUKIDNON, SERVICES, getPosition, peso, type ServiceId } from "@/lib/glide";
import { searchPlaces, reverseGeocode, type PlaceHit } from "@/lib/maps.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FETCH — Motorcycle rides & pabili errands in Bukidnon" },
      {
        name: "description",
        content:
          "Book a motorcycle ride on a live map or send a rider to fetch anything. Pick your trusted rider, pay Moto Plus and errands with GCash.",
      },
      { property: "og:title", content: "FETCH — Motorcycle rides & pabili errands in Bukidnon" },
      {
        property: "og:description",
        content:
          "Live map booking, trusted rider profiles with ratings, and GCash payments for Moto Plus and errands.",
      },
    ],
  }),
  component: RideHome,
});

type Point = { label: string; lat: number; lng: number } | null;

function RideHome() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const search = useServerFn(searchPlaces);
  const rgeo = useServerFn(reverseGeocode);

  const [me, setMe] = useState<LatLng>(BUKIDNON);
  const [pickup, setPickup] = useState<Point>(null);
  const [drop, setDrop] = useState<Point>(null);
  const [service, setService] = useState<ServiceId>("moto");
  const [errand, setErrand] = useState("");
  const [payMethod, setPayMethod] = useState<"gcash" | "cash">("gcash");
  const [riders, setRiders] = useState<Profile[]>([]);
  const [preferred, setPreferred] = useState<string | null>(null);
  const [field, setField] = useState<"pickup" | "drop">("pickup");
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [ride, setRide] = useState<any>(null);
  const [assigned, setAssigned] = useState<Profile | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live position of the person booking
  useEffect(() => {
    void getPosition().then(async (p) => {
      setMe(p);
      try {
        if (user) {
          const { label } = await rgeo({ data: p });
          setPickup({ label, ...p });
        }
      } catch {
        setPickup({ label: "My current location", ...p });
      }
    });
  }, [user, rgeo]);

  // Online riders nearby
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_online", true)
        .not("current_lat", "is", null)
        .order("rating_avg", { ascending: false })
        .limit(12);
      if (alive) setRiders(((data ?? []) as Profile[]).filter((r) => r.id !== user.id));
    };
    void load();
    const t = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [user]);

  // Follow the active request
  useEffect(() => {
    if (!ride || ride.status === "completed" || ride.status === "cancelled") return;
    const t = setInterval(async () => {
      const { data } = await supabase.from("rides").select("*").eq("id", ride.id).maybeSingle();
      if (!data) return;
      setRide(data);
      if (data.rider_id) {
        const { data: r } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.rider_id)
          .maybeSingle();
        setAssigned((r as Profile) ?? null);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [ride]);

  const runSearch = useCallback(
    (value: string) => {
      setTerm(value);
      if (debounce.current) clearTimeout(debounce.current);
      if (value.trim().length < 3) {
        setHits([]);
        return;
      }
      debounce.current = setTimeout(async () => {
        try {
          const res = await search({ data: { query: value, lat: me.lat, lng: me.lng } });
          setHits(res);
        } catch {
          setHits([]);
        }
      }, 320);
    },
    [me.lat, me.lng, search],
  );

  function choose(hit: PlaceHit) {
    const point = { label: hit.label, lat: hit.lat, lng: hit.lng };
    if (field === "pickup") setPickup(point);
    else setDrop(point);
    setTerm("");
    setHits([]);
  }

  async function handleMapClick(p: LatLng) {
    if (!user) return;
    let label = `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
    try {
      label = (await rgeo({ data: p })).label;
    } catch {
      /* keep coordinates */
    }
    if (field === "pickup") setPickup({ label, ...p });
    else setDrop({ label, ...p });
  }

  const svc = SERVICES.find((s) => s.id === service)!;
  const isFetch = service === "fetch";

  async function requestRide() {
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    if (!pickup || !drop) {
      toast.error("Set a pickup and a drop-off first.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("rides")
      .insert({
        passenger_id: user.id,
        rider_id: preferred,
        service,
        pickup_label: pickup.label,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_label: drop.label,
        dropoff_lat: drop.lat,
        dropoff_lng: drop.lng,
        errand_note: isFetch ? errand : null,
        fare_cents: svc.fare,
        payment_method: payMethod,
      })
      .select("*")
      .single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRide(data);
    toast.success(preferred ? "Sent to your trusted rider." : "Looking for a rider nearby…");
  }

  async function cancelRide() {
    if (!ride) return;
    await supabase.from("rides").update({ status: "cancelled" }).eq("id", ride.id);
    setRide(null);
    setAssigned(null);
  }

  async function payNow() {
    if (!ride) return;
    const reference = `GC${Date.now().toString().slice(-10)}`;
    const { error } = await supabase
      .from("rides")
      .update({ payment_status: "paid", payment_reference: reference })
      .eq("id", ride.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRide({ ...ride, payment_status: "paid", payment_reference: reference });
    toast.success(`Paid ${peso(ride.fare_cents)} via ${ride.payment_method === "gcash" ? "GCash" : "cash"}.`);
  }

  const markers = [
    ...(pickup ? [{ position: { lat: pickup.lat, lng: pickup.lng }, kind: "pickup" as const, title: pickup.label }] : []),
    ...(drop ? [{ position: { lat: drop.lat, lng: drop.lng }, kind: "dropoff" as const, title: drop.label }] : []),
    { position: me, kind: "me" as const, title: "You are here" },
    ...riders
      .filter((r) => r.current_lat && r.current_lng)
      .map((r) => ({
        position: { lat: r.current_lat!, lng: r.current_lng! },
        kind: "rider" as const,
        title: r.full_name,
      })),
  ];

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-background font-body text-foreground">
      <RideMap
        center={me}
        markers={markers}
        route={pickup && drop ? [{ lat: pickup.lat, lng: pickup.lng }, { lat: drop.lat, lng: drop.lng }] : null}
        onMapClick={handleMapClick}
        className="absolute inset-0 h-[58dvh] w-full"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent" />

      <div className="absolute left-3 top-3 z-10 space-y-1.5">
        <div className="font-display text-lg font-bold leading-none tracking-[0.12em]">
          FETCH<span className="text-primary">.</span>
        </div>
        <div className="inline-block rounded-md bg-card/70 px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-foreground/60 ring-1 ring-white/10">
          <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-primary align-middle" />
          LIVE {me.lat.toFixed(4)}°N {me.lng.toFixed(4)}°E
        </div>
      </div>
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        {user ? (
          <Link
            to="/dashboard"
            className="rounded-full bg-card/70 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/60 ring-1 ring-white/10"
          >
            {profile?.full_name?.split(" ")[0] ?? "Account"}
          </Link>
        ) : (
          <Link
            to="/auth"
            className="rounded-full bg-primary px-3 py-1.5 font-display text-[11px] font-bold text-primary-foreground"
          >
            Sign in
          </Link>
        )}
      </div>

      <div className="animate-rise absolute inset-x-0 bottom-0 z-20 max-h-[72dvh] overflow-y-auto pb-[76px]">
        <div className="glass-sheet rounded-t-[26px] p-4 pt-3 ring-1 ring-white/15">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />

          {ride ? (
            <ActiveRide
              ride={ride}
              rider={assigned}
              onCancel={cancelRide}
              onPay={payNow}
              onDone={() => setRide(null)}
            />
          ) : (
            <>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setField("pickup")}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left ring-1 ${
                    field === "pickup" ? "bg-card/70 ring-primary/40" : "bg-card/40 ring-white/10"
                  }`}
                >
                  <span className="size-2 shrink-0 rounded-full bg-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground/85">
                    {pickup?.label ?? "Set your pickup point"}
                  </span>
                  <span className="font-mono text-[9px] text-foreground/40">PICKUP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setField("drop")}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left ring-1 ${
                    field === "drop" ? "bg-card/70 ring-primary/40" : "bg-card/40 ring-white/10"
                  }`}
                >
                  <span className="size-2 shrink-0 rounded-full border-2 border-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {drop?.label ?? (isFetch ? "Where should the rider buy?" : "Where to?")}
                  </span>
                  <span className="font-mono text-[9px] text-foreground/40">
                    {isFetch ? "STORE" : "DROP"}
                  </span>
                </button>

                <div className="rounded-xl bg-card/40 px-3 py-2 ring-1 ring-white/10">
                  <input
                    value={term}
                    onChange={(e) => runSearch(e.target.value)}
                    placeholder={`Search a place for ${field === "pickup" ? "pickup" : "drop-off"} — or tap the map`}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                {hits.length > 0 && (
                  <div className="space-y-1 rounded-xl bg-card/60 p-1 ring-1 ring-white/10">
                    {hits.map((h) => (
                      <button
                        key={`${h.lat}-${h.lng}-${h.label}`}
                        type="button"
                        onClick={() => choose(h)}
                        className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-white/5"
                      >
                        <span className="block truncate text-sm">{h.label}</span>
                        <span className="block truncate font-mono text-[10px] text-foreground/45">
                          {h.address}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {isFetch && (
                  <textarea
                    value={errand}
                    onChange={(e) => setErrand(e.target.value)}
                    rows={2}
                    placeholder="What should your rider fetch? e.g. 2 iced coffees, bayad sa Meralco, pick up a parcel"
                    className="w-full resize-none rounded-xl bg-card/50 px-3 py-2.5 text-sm outline-none ring-1 ring-primary/30 placeholder:text-muted-foreground"
                  />
                )}
              </div>

              <div className="mt-3 space-y-1.5">
                {SERVICES.map((s) => {
                  const active = s.id === service;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setService(s.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        active ? "bg-primary/15 ring-1 ring-primary/40" : "bg-card/40 ring-1 ring-white/10"
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
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          {s.name}
                          {s.fare === 0 && (
                            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold uppercase text-primary-foreground">
                              Free
                            </span>
                          )}
                        </span>
                        <span className="block font-mono text-[10px] text-foreground/50">{s.meta}</span>
                      </span>
                      <span className="ml-auto font-display text-base font-bold">{peso(s.fare)}</span>
                    </button>
                  );
                })}
              </div>

              {svc.fare > 0 && (
                <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                  {(["gcash", "cash"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`rounded-xl px-3 py-2.5 text-left ${
                        payMethod === m
                          ? "bg-primary/15 ring-1 ring-primary/40"
                          : "bg-card/40 ring-1 ring-white/10"
                      }`}
                    >
                      <span className="block font-display text-sm font-bold">
                        {m === "gcash" ? "GCash" : "Cash"}
                      </span>
                      <span className="block font-mono text-[9px] text-foreground/45">
                        {m === "gcash" ? "e-wallet in app" : "pay your rider"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {user && riders.length > 0 && (
                <div className="mt-3">
                  <div className="px-1 font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/45">
                    Trusted riders online
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {riders.slice(0, 4).map((r) => (
                      <PersonRow
                        key={r.id}
                        name={r.full_name || "Rider"}
                        photo={r.photo_url}
                        rating={Number(r.rating_avg)}
                        ratingCount={r.rating_count}
                        detail={[r.moto_model, r.plate_number].filter(Boolean).join(" · ")}
                        selected={preferred === r.id}
                        onClick={() => setPreferred(preferred === r.id ? null : r.id)}
                        right={
                          <span className="font-mono text-[9px] uppercase text-foreground/40">
                            {preferred === r.id ? "chosen" : "pick"}
                          </span>
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={requestRide}
                className="relative mt-3.5 h-14 w-full overflow-hidden rounded-2xl bg-primary disabled:opacity-70"
              >
                <span className="relative z-10 font-display text-base font-bold uppercase tracking-[0.08em] text-primary-foreground">
                  {!user
                    ? "Sign in to book"
                    : busy
                      ? "Sending…"
                      : isFetch
                        ? "Send a rider"
                        : svc.fare === 0
                          ? "Request free ride"
                          : `Book · ${peso(svc.fare)}`}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}

function ActiveRide({
  ride,
  rider,
  onCancel,
  onPay,
  onDone,
}: {
  ride: any;
  rider: Profile | null;
  onCancel: () => void;
  onPay: () => void;
  onDone: () => void;
}) {
  const waiting = ride.status === "requested";
  return (
    <div>
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/45">
          {waiting ? "Finding your rider" : `Ride ${ride.status}`}
        </span>
        <span className="font-display text-sm font-bold text-primary">{peso(ride.fare_cents)}</span>
      </div>

      {rider ? (
        <div className="mt-2">
          <PersonRow
            name={rider.full_name || "Rider"}
            photo={rider.photo_url}
            rating={Number(rider.rating_avg)}
            ratingCount={rider.rating_count}
            detail={[rider.moto_model, rider.plate_number].filter(Boolean).join(" · ")}
          />
        </div>
      ) : (
        <div className="mt-2 rounded-xl bg-card/45 px-3 py-4 text-center text-sm text-foreground/70 ring-1 ring-white/10">
          Waiting for a rider to accept…
        </div>
      )}

      <div className="mt-2 rounded-xl bg-card/40 px-3 py-2.5 ring-1 ring-white/10">
        <div className="text-sm text-foreground/80">{ride.pickup_label}</div>
        <div className="text-sm font-medium text-primary">{ride.dropoff_label}</div>
        {ride.errand_note && (
          <div className="mt-1 font-mono text-[10px] text-foreground/50">{ride.errand_note}</div>
        )}
      </div>

      {ride.fare_cents > 0 && ride.payment_status === "unpaid" && (
        <button
          type="button"
          onClick={onPay}
          className="mt-2 h-12 w-full rounded-2xl bg-primary/20 font-display text-sm font-bold text-primary ring-1 ring-primary/40"
        >
          Pay {peso(ride.fare_cents)} with {ride.payment_method === "gcash" ? "GCash" : "cash"}
        </button>
      )}
      {ride.payment_status === "paid" && (
        <div className="mt-2 rounded-xl bg-primary/10 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-primary">
          Paid · ref {ride.payment_reference}
        </div>
      )}

      <button
        type="button"
        onClick={ride.status === "completed" ? onDone : onCancel}
        className="mt-1.5 h-12 w-full rounded-2xl bg-destructive/15 font-display text-sm font-bold uppercase tracking-[0.08em] text-destructive ring-1 ring-destructive/30"
      >
        {ride.status === "completed" ? "Close" : "Cancel request"}
      </button>
    </div>
  );
}
