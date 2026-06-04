import type { QuotaStats } from "../types";

export function QuotaBadge({ quota }: { quota: QuotaStats | null }) {
  const klass = "font-mono text-[11px] text-right text-neutral-500 whitespace-nowrap [&_b]:text-black";
  if (!quota) return <div className={klass}>quota: …</div>;
  const { rateLimit, cacheHits, upstreamCalls, cacheHitRate } = quota;
  const reset = rateLimit.resetAt ? new Date(rateLimit.resetAt).toLocaleDateString() : "—";
  return (
    <div className={klass}>
      <div>
        API quota:{" "}
        <b>
          {rateLimit.remaining ?? "—"}
          {rateLimit.limit != null ? ` / ${rateLimit.limit}` : ""}
        </b>{" "}
        left · resets {reset}
      </div>
      <div>
        cache saved <b>{cacheHits}</b> of {cacheHits + upstreamCalls} calls ({Math.round(cacheHitRate * 100)}%)
      </div>
    </div>
  );
}
