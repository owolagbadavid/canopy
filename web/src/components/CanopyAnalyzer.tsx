import { useRef, useState } from "react";
import { analyzeTrees } from "../api";
import type { TreeAnalysis } from "../types";
import { card, cardBody, cardHeader, errorBox, label, note, pill, pillSample } from "../ui";

function Stat({ n, k }: { n: string; k: string }) {
  return (
    <div className="font-mono">
      <span className="text-[28px] font-bold block">{n}</span>
      <span className="text-[11px] text-neutral-500 uppercase tracking-wide">{k}</span>
    </div>
  );
}

function HealthBar({ a }: { a: TreeAnalysis }) {
  const h = a.treeHealth.healthy ?? 0;
  const c = a.treeHealth.needsCare ?? 0;
  const r = a.treeHealth.needsReplacement ?? 0;
  const total = h + c + r || 1;
  const pct = (n: number) => `${(n / total) * 100}%`;
  const seg = "flex items-center justify-center overflow-hidden whitespace-nowrap";
  return (
    <>
      <div className="flex h-5.5 border border-black my-2 font-mono text-[10px]">
        {h > 0 && (
          <span className={`${seg} bg-white text-black`} style={{ width: pct(h) }}>
            {h}
          </span>
        )}
        {c > 0 && (
          <span className={`${seg} bg-neutral-400 text-black`} style={{ width: pct(c) }}>
            {c}
          </span>
        )}
        {r > 0 && (
          <span className={`${seg} bg-black text-white`} style={{ width: pct(r) }}>
            {r}
          </span>
        )}
      </div>
      <div className={note}>■ healthy · ▣ needs care · ◼ replacement</div>
    </>
  );
}

export function CanopyAnalyzer({ onAnalyzed }: { onAnalyzed?: () => void }) {
  const [over, setOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TreeAnalysis | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeTrees(file);
      setResult(res);
      onAnalyzed?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={card}>
      <h2 className={cardHeader}>Tree-canopy analysis</h2>
      <div className={cardBody}>
        <div
          className={`border-[1.5px] border-dashed border-black p-6.5 text-center font-mono text-[13px] cursor-pointer ${
            over ? "bg-black text-white" : "bg-neutral-100"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) run(f);
          }}
        >
          {loading
            ? "Analyzing crowns…"
            : "Drop an orchard / aerial photo here, or click to upload (JPEG / PNG / WEBP)"}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) run(f);
              e.target.value = "";
            }}
          />
        </div>

        {error && <div className={`${errorBox} mt-3`}>⚠ {error}</div>}

        {result && (
          <div className="mt-4">
            <div className="mb-2.5">
              {result.source === "sample" ? (
                <span className={pillSample}>sample result</span>
              ) : (
                <span className={pill}>live analysis</span>
              )}
              {result.confidenceScore != null && (
                <span className={`${note} ml-2.5 inline`}>
                  confidence {(result.confidenceScore * 100).toFixed(0)}%
                </span>
              )}
            </div>

            {(result.lowConfidence || result.totalTreeCount === 0) && (
              <div className={`${errorBox} mb-3`}>
                ⚠ Low confidence — the model couldn't detect tree crowns in this image. Use a clear
                top-down aerial / drone photo of an orchard.
              </div>
            )}

            <div className="flex flex-wrap gap-4.5 mb-3">
              <Stat n={result.totalTreeCount?.toString() ?? "—"} k="trees" />
              <Stat n={result.treeDensityPerAcre?.toString() ?? "—"} k="per acre" />
              <Stat
                n={
                  result.canopyCoveragePct != null ? `${result.canopyCoveragePct.toFixed(0)}%` : "—"
                }
                k="canopy"
              />
            </div>

            <HealthBar a={result} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3.5">
              <div>
                {result.observations.length > 0 && (
                  <>
                    <div className={label}>Observations</div>
                    <ul className="list-disc pl-4.5 my-1.5 text-[13px] [&>li]:mb-1">
                      {result.observations.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </>
                )}
                {result.recommendations.length > 0 && (
                  <>
                    <div className={label}>Recommendations</div>
                    <ul className="list-disc pl-4.5 my-1.5 text-[13px] [&>li]:mb-1">
                      {result.recommendations.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </>
                )}
                {result.geminiError &&
                  result.observations.length === 0 &&
                  result.recommendations.length === 0 && (
                    <div className={note}>
                      AI notes unavailable — the platform's Gemini service is not configured, so
                      observations &amp; recommendations were skipped. The CV metrics above are
                      unaffected.
                    </div>
                  )}
              </div>
              {result.overlayImageUrl && (
                <div>
                  <div className={label}>Annotated overlay</div>
                  <img
                    className="w-full border border-black block"
                    src={result.overlayImageUrl}
                    alt="Annotated canopy overlay"
                  />
                </div>
              )}
            </div>

            {result.meta?.fallbackReason && (
              <div className={`${note} mt-2.5`}>
                Showing a bundled sample — live analysis unavailable: {result.meta.fallbackReason}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
