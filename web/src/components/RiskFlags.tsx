import type { RiskFlag } from "../types";
import { card, cardBody, cardHeader, empty } from "../ui";

export function RiskFlags({ risks }: { risks: RiskFlag[] }) {
  return (
    <div className={card}>
      <h2 className={cardHeader}>Agronomic risk</h2>
      <div className={cardBody}>
        {risks.length === 0 ? (
          <div className={empty}>No notable risks in the next 3 days.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {risks.map((r) => (
              <div className="flex gap-2.5 items-baseline border-l-[3px] border-black pl-2.5 py-1.5" key={r.kind}>
                <span
                  className={`font-mono text-[10px] uppercase tracking-wide border border-black px-1.5 py-px whitespace-nowrap ${
                    r.level === "warning" ? "bg-black text-white" : ""
                  }`}
                >
                  {r.level}
                </span>
                <div>
                  <span className="font-bold">{r.title}</span>{" "}
                  <span className="text-neutral-500 text-[13px]">— {r.detail}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
