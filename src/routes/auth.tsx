import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Glide motorcycle rides & errands" },
      {
        name: "description",
        content:
          "Create your Glide account as a passenger or a motorcycle rider to book rides, run pabili errands and get paid through GCash.",
      },
      { property: "og:title", content: "Sign in — Glide motorcycle rides & errands" },
      {
        property: "og:description",
        content: "Join Glide as a passenger or motorcycle rider in Metro Manila.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [role, setRole] = useState<"passenger" | "rider">("passenger");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name, role },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Almost there — confirm your email to finish signing up.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
  }

  return (
    <main className="min-h-dvh bg-background px-5 py-10 font-body text-foreground">
      <div className="mx-auto w-full max-w-sm">
        <Link to="/" className="font-display text-2xl font-bold tracking-tight text-foreground">
          Glide<span className="text-primary">.</span>
        </Link>
        <h1 className="mt-6 font-display text-2xl font-bold">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rides and pabili errands across Metro Manila.
        </p>

        {sent ? (
          <div className="mt-8 rounded-2xl bg-card/60 p-5 ring-1 ring-white/10">
            <p className="text-sm text-foreground/80">
              We sent a confirmation link to <span className="font-semibold">{email}</span>. Open it
              to activate your account, then come back and sign in.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setMode("signin");
              }}
              className="mt-4 h-11 w-full rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              className="mt-7 h-12 w-full rounded-2xl bg-foreground/10 font-display text-sm font-bold text-foreground ring-1 ring-white/15"
            >
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/35">
              <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5">
              {mode === "signup" && (
                <>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["passenger", "rider"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`rounded-xl px-3 py-3 text-left transition-colors ${
                          role === r
                            ? "bg-primary/15 ring-1 ring-primary/40"
                            : "bg-card/40 ring-1 ring-white/10"
                        }`}
                      >
                        <span className="block font-display text-sm font-bold">
                          {r === "passenger" ? "I book rides" : "I'm a rider"}
                        </span>
                        <span className="block font-mono text-[9px] text-foreground/45">
                          {r === "passenger" ? "passenger" : "motorcycle driver"}
                        </span>
                      </button>
                    ))}
                  </div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Full name"
                    className="h-12 w-full rounded-xl bg-card/50 px-3.5 text-sm outline-none ring-1 ring-white/10 placeholder:text-muted-foreground focus:ring-primary/40"
                  />
                </>
              )}
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="Email"
                className="h-12 w-full rounded-xl bg-card/50 px-3.5 text-sm outline-none ring-1 ring-white/10 placeholder:text-muted-foreground focus:ring-primary/40"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                minLength={6}
                placeholder="Password"
                className="h-12 w-full rounded-xl bg-card/50 px-3.5 text-sm outline-none ring-1 ring-white/10 placeholder:text-muted-foreground focus:ring-primary/40"
              />
              <button
                type="submit"
                disabled={busy}
                className="h-13 mt-1 h-12 w-full rounded-2xl bg-primary font-display text-sm font-bold uppercase tracking-[0.08em] text-primary-foreground disabled:opacity-60"
              >
                {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="mt-4 w-full text-center text-xs text-foreground/55"
            >
              {mode === "signup"
                ? "Already have an account? Sign in"
                : "New to Glide? Create an account"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
