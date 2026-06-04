import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { deleteLocation, listLocations, saveLocation } from "../api";
import type { SavedLocation } from "../types";
import { btn, btnGhost, input } from "../ui";

export interface Place {
  name: string;
  lat: number;
  lon: number;
}

const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="22" height="30" viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 0C5 0 0 4.7 0 10.5 0 18 11 30 11 30s11-12 11-19.5C22 4.7 17 0 11 0z" fill="#000"/>
    <circle cx="11" cy="10.5" r="4" fill="#fff"/>
  </svg>`,
  iconSize: [22, 30],
  iconAnchor: [11, 30],
});

const fmt = (la: number, lo: number): Place => ({
  name: `${la.toFixed(3)}, ${lo.toFixed(3)}`,
  lat: la,
  lon: lo,
});

function MapController({ value, onPick }: { value: Place; onPick: (p: Place) => void }) {
  const map = useMap();
  useMapEvents({
    click(e) {
      onPick(fmt(e.latlng.lat, e.latlng.lng));
    },
  });
  useEffect(() => {
    map.setView([value.lat, value.lon], map.getZoom());
  }, [map, value.lat, value.lon]);
  return <Marker position={[value.lat, value.lon]} icon={pinIcon} />;
}

export function LocationPicker({
  value,
  onChange,
  authed,
}: {
  value: Place;
  onChange: (p: Place) => void;
  authed: boolean;
}) {
  const [lat, setLat] = useState(String(value.lat));
  const [lon, setLon] = useState(String(value.lon));
  const [saved, setSaved] = useState<SavedLocation[]>([]);

  useEffect(() => {
    if (!authed) {
      setSaved([]);
      return;
    }
    listLocations()
      .then(setSaved)
      .catch(() => {});
  }, [authed]);

  const pick = (p: Place) => {
    setLat(String(p.lat));
    setLon(String(p.lon));
    onChange(p);
  };

  const saveCurrent = async () => {
    const name = window.prompt("Name this farm:", value.name);
    if (name === null) return;
    try {
      const loc = await saveLocation({
        name: name.trim() || value.name,
        lat: value.lat,
        lon: value.lon,
      });
      setSaved((s) => [loc, ...s]);
    } catch {
      /* ignore */
    }
  };

  const remove = async (id: string) => {
    setSaved((s) => s.filter((l) => l.id !== id));
    await deleteLocation(id).catch(() => {});
  };

  const submit = () => {
    const la = Number(lat);
    const lo = Number(lon);
    if (Number.isFinite(la) && Number.isFinite(lo)) pick(fmt(la, lo));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) =>
      pick({ name: "My location", lat: pos.coords.latitude, lon: pos.coords.longitude }),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <MapContainer
        center={[value.lat, value.lon]}
        zoom={9}
        scrollWheelZoom={false}
        className="h-64 w-full border border-black"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController value={value} onPick={pick} />
      </MapContainer>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="font-mono text-[11px] text-neutral-500">
          click the map, or enter coords:
        </span>
        <input
          aria-label="latitude"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          className={`${input} w-24`}
        />
        <input
          aria-label="longitude"
          value={lon}
          onChange={(e) => setLon(e.target.value)}
          className={`${input} w-24`}
        />
        <button className={btn} onClick={submit}>
          Go
        </button>
        <button className={btnGhost} onClick={useMyLocation}>
          Use my location
        </button>
        {authed && (
          <button className={btnGhost} onClick={saveCurrent}>
            ★ Save farm
          </button>
        )}
      </div>

      {saved.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="font-mono text-[11px] text-neutral-500">your farms:</span>
          {saved.map((s) => (
            <span key={s.id} className="inline-flex items-stretch border border-black">
              <button
                className="font-mono text-[13px] px-2.5 py-1.5 bg-white text-black hover:bg-black hover:text-white"
                onClick={() => pick({ name: s.name, lat: s.lat, lon: s.lon })}
              >
                {s.name}
              </button>
              <button
                aria-label={`remove ${s.name}`}
                className="font-mono text-[13px] px-2 py-1.5 border-l border-black bg-white text-black hover:bg-black hover:text-white"
                onClick={() => remove(s.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
