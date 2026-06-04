import type { AnalysisHistoryItem } from "../types";
import { card, cardBody, cardHeader, empty, pill, pillSample } from "../ui";

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function HistoryPanel({ items }: { items: AnalysisHistoryItem[] }) {
  return (
    <div className={card}>
      <h2 className={cardHeader}>Analysis history</h2>
      <div className={cardBody}>
        {items.length === 0 ? (
          <div className={empty}>No saved analyses yet — run a canopy analysis below.</div>
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-200">
                <th className="py-1 font-normal">when</th>
                <th className="py-1 font-normal">trees</th>
                <th className="py-1 font-normal">canopy</th>
                <th className="py-1 font-normal">conf.</th>
                <th className="py-1 font-normal">source</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-neutral-100 last:border-0">
                  <td className="py-1">{when(a.createdAt)}</td>
                  <td className="py-1">{a.totalTreeCount ?? "—"}</td>
                  <td className="py-1">{a.canopyCoveragePct != null ? `${a.canopyCoveragePct.toFixed(0)}%` : "—"}</td>
                  <td className="py-1">{a.confidenceScore != null ? `${(a.confidenceScore * 100).toFixed(0)}%` : "—"}</td>
                  <td className="py-1">
                    <span className={a.source === "sample" ? pillSample : pill}>{a.source}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
