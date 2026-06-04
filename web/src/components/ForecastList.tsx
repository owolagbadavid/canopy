import type { DailyForecast, WeatherModel } from "../types";
import { card, cardHeader } from "../ui";

function dow(date: string): string {
  const d = new Date(date + "T00:00:00");
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString("en", { weekday: "short" });
}

export function ForecastList({ data }: { data: WeatherModel }) {
  const t = data.units.temperature;
  const days = data.daily.slice(0, 7);
  return (
    <div className={card}>
      <h2 className={cardHeader}>{days.length}-day forecast</h2>
      <div className="grid grid-cols-4 sm:grid-cols-7">
        {days.map((d: DailyForecast) => (
          <div
            className="border-r border-neutral-200 last:border-r-0 px-1.5 py-2.5 text-center font-mono text-xs"
            key={d.date}
            title={d.conditionLabel}
          >
            <div className="font-bold uppercase text-[11px]">{dow(d.date)}</div>
            {d.icon && <img className="grayscale w-8.5 h-8.5 mx-auto block my-1" src={d.icon} alt={d.conditionLabel} />}
            <div className="text-[15px] font-bold">
              {Math.round(d.tempMax)}
              {t}
            </div>
            <div className="text-neutral-500">
              {Math.round(d.tempMin)}
              {t}
            </div>
            {d.precipitationProbability != null && (
              <div className="text-neutral-500 mt-1">{d.precipitationProbability}%</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
