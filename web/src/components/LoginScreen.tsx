import { useState } from "react";
import { login } from "../api";
import type { User } from "../types";
import { btn, btnGhost, card, cardBody, cardHeader, errorBox, input } from "../ui";

export function LoginCard({
  onLoggedIn,
  onCancel,
}: {
  onLoggedIn: (u: User) => void;
  onCancel?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onLoggedIn(await login(email.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={card}>
      <h2 className={cardHeader}>Sign in</h2>
      <form className={`${cardBody} flex flex-wrap gap-2 items-center`} onSubmit={submit}>
        <span className="font-mono text-[11px] text-neutral-500">
          email only — no password. Unlocks saving farms &amp; tree analysis:
        </span>
        <input
          type="email"
          required
          autoFocus
          placeholder="you@farm.co"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${input} w-56`}
        />
        <button className={btn} disabled={busy} type="submit">
          {busy ? "Signing in…" : "Continue"}
        </button>
        {onCancel && (
          <button type="button" className={btnGhost} onClick={onCancel}>
            Cancel
          </button>
        )}
        {error && <div className={`${errorBox} w-full`}>⚠ {error}</div>}
      </form>
    </div>
  );
}
