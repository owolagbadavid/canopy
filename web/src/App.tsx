import { useCallback, useEffect, useState } from "react";
import { fetchQuota, fetchWeather, getMe, listAnalyses, logout } from "./api";
import type { AnalysisHistoryItem, QuotaStats, User, WeatherModel } from "./types";
import { LocationPicker, type Place } from "./components/LocationPicker";
import { QuotaBadge } from "./components/QuotaBadge";
import { WeatherPanel } from "./components/WeatherPanel";
import { ForecastList } from "./components/ForecastList";
import { RiskFlags } from "./components/RiskFlags";
import { CanopyAnalyzer } from "./components/CanopyAnalyzer";
import { HistoryPanel } from "./components/HistoryPanel";
import { LoginCard } from "./components/LoginScreen";
import { btn, card, cardBody, cardHeader, empty, errorBox, label, note } from "./ui";

const DEFAULT_PLACE: Place = { name: "Nairobi", lat: -1.2921, lon: 36.8219 };

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {});
  }, []);

  return <Dashboard user={user} setUser={setUser} />;
}

function Dashboard({ user, setUser }: { user: User | null; setUser: (u: User | null) => void }) {
  const [place, setPlace] = useState<Place>(DEFAULT_PLACE);
  const [weather, setWeather] = useState<WeatherModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaStats | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [showLogin, setShowLogin] = useState(false);

  const refreshQuota = useCallback(() => {
    fetchQuota()
      .then(setQuota)
      .catch(() => {});
  }, []);
  const refreshHistory = useCallback(() => {
    if (!user) return setHistory([]);
    listAnalyses()
      .then(setHistory)
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchWeather({ lat: place.lat, lon: place.lon })
      .then((w) => !cancelled && setWeather(w))
      .catch(
        (e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load weather"),
      )
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          refreshQuota();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [place, refreshQuota]);

  const onAnalyzed = useCallback(() => {
    refreshQuota();
    refreshHistory();
  }, [refreshQuota, refreshHistory]);

  const doLogout = async () => {
    await logout();
    setUser(null);
  };
  const onLoggedIn = (u: User) => {
    setUser(u);
    setShowLogin(false);
  };

  return (
    <div className="max-w-230 mx-auto px-5 pt-8 pb-20">
      <header className="flex justify-between items-end flex-wrap gap-4 border-b-2 border-black pb-3.5 mb-2">
        <div>
          <h1 className="text-3xl tracking-tight m-0">Canopy</h1>
          <div className="font-mono text-xs text-neutral-500 mt-1">
            orchard intelligence · powered by WeatherAI
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="font-mono text-[11px] text-neutral-500">
            {user ? (
              <>
                {user.email} ·{" "}
                <button
                  className="underline hover:no-underline cursor-pointer bg-transparent border-0 p-0 text-neutral-500"
                  onClick={doLogout}
                >
                  log out
                </button>
              </>
            ) : (
              <button
                className="underline hover:no-underline cursor-pointer bg-transparent border-0 p-0 text-neutral-500"
                onClick={() => setShowLogin(true)}
              >
                sign in
              </button>
            )}
          </div>
          <QuotaBadge quota={quota} />
        </div>
      </header>

      {!user && showLogin && (
        <LoginCard onLoggedIn={onLoggedIn} onCancel={() => setShowLogin(false)} />
      )}

      <div className={card}>
        <h2 className={cardHeader}>
          Location
          {loading ? (
            <span className="animate-pulse"> · loading…</span>
          ) : weather?.meta.cached ? (
            " · cached"
          ) : (
            ""
          )}
        </h2>
        <div className={cardBody}>
          <LocationPicker value={place} onChange={setPlace} authed={!!user} />
          <div className={note}>Showing: {place.name}</div>
        </div>
      </div>

      {error && <div className={`${errorBox} mt-5.5`}>⚠ {error}</div>}

      {loading && !weather && (
        <div className={card}>
          <div className="bg-neutral-100 text-neutral-500 font-mono text-[13px] p-5 text-center animate-pulse">
            Loading weather…
          </div>
        </div>
      )}

      {weather && (
        <div
          className={
            loading ? "opacity-40 pointer-events-none transition-opacity" : "transition-opacity"
          }
        >
          <WeatherPanel data={weather} />
          <ForecastList data={weather} />
          <RiskFlags risks={weather.risks} />
          {weather.aiSummary && (
            <div className={card}>
              <h2 className={cardHeader}>AI agronomic summary</h2>
              <div className={`${cardBody} text-sm`}>
                <div className={label}>Gemini · WeatherAI</div>
                <p className="m-0">{weather.aiSummary}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {user ? (
        <>
          <CanopyAnalyzer onAnalyzed={onAnalyzed} />
          <HistoryPanel items={history} />
        </>
      ) : (
        <div className={card}>
          <h2 className={cardHeader}>Tree-canopy analysis</h2>
          <div className={cardBody}>
            <div className={empty}>
              Sign in to upload an orchard photo and run tree-canopy analysis.
            </div>
            <button className={`${btn} mt-3`} onClick={() => setShowLogin(true)}>
              Sign in
            </button>
          </div>
        </div>
      )}

      <footer className="mt-10 border-t border-neutral-200 pt-3.5 font-mono text-[11px] text-neutral-500">
        Canopy · Weather is public; signing in (email only) unlocks saved farms, higher rate limit
        and tree-analysis history
      </footer>
    </div>
  );
}
