import type { WeatherModel } from "../types";
import { card, cardBody, cardHeader } from "../ui";

export function WeatherPanel({ data }: { data: WeatherModel }) {
  const c = data.current;
  const t = data.units.temperature;
  const w = data.units.wind;
  return (
    <div className={card}>
      <h2 className={cardHeader}>
        Current · {data.location.timezone ?? `${data.location.lat.toFixed(2)}, ${data.location.lon.toFixed(2)}`}
      </h2>
      <div className={cardBody}>
        <div className="flex items-baseline gap-4.5 flex-wrap">
          {c.icon && <img className="grayscale w-14 h-14" src={c.icon} alt="" />}
          <div className="text-[52px] font-bold tracking-[-2px] leading-none">
            {Math.round(c.temperature)}
            {t}
          </div>
          <div>
            <div className="text-base">{c.conditionLabel}</div>
            <div className="font-mono text-xs text-neutral-500 flex gap-4 flex-wrap [&_b]:text-black [&_b]:font-semibold">
              {c.feelsLike != null && (
                <span>
                  feels <b>{Math.round(c.feelsLike)}{t}</b>
                </span>
              )}
              {c.humidity != null && (
                <span>
                  humidity <b>{c.humidity}%</b>
                </span>
              )}
              <span>
                wind <b>{Math.round(c.windSpeed)} {w}</b>
              </span>
              {c.windGust != null && (
                <span>
                  gust <b>{Math.round(c.windGust)} {w}</b>
                </span>
              )}
              {c.uvIndex != null && (
                <span>
                  UV <b>{c.uvIndex.toFixed(1)}</b>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
