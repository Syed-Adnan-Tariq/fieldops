'use client';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  accuracy?: number;
  batteryLevel?: number;
}

interface HistoryMapProps {
  workerId: string;
  workerName: string;
  points: LocationPoint[];
}

export function HistoryMap({ workerId, workerName, points }: HistoryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [playIndex, setPlayIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    if (!token || !points.length) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [points[0].longitude, points[0].latitude],
      zoom: 14,
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      // Draw full route line
      const coords = points.map(p => [p.longitude, p.latitude] as [number, number]);
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#1D4ED8', 'line-width': 3, 'line-opacity': 0.6 },
      });

      // Start/end markers
      new mapboxgl.Marker({ color: '#10B981' })
        .setLngLat(coords[0])
        .setPopup(new mapboxgl.Popup().setText(`Start: ${new Date(points[0].timestamp).toLocaleTimeString()}`))
        .addTo(map);
      new mapboxgl.Marker({ color: '#EF4444' })
        .setLngLat(coords[coords.length - 1])
        .setPopup(new mapboxgl.Popup().setText(`End: ${new Date(points[points.length - 1].timestamp).toLocaleTimeString()}`))
        .addTo(map);

      // Moving marker
      const el = document.createElement('div');
      el.style.cssText =
        'width:20px;height:20px;border-radius:50%;background:#1D4ED8;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)';
      const m = new mapboxgl.Marker(el).setLngLat(coords[0]).addTo(map);
      markerRef.current = m;
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [points]);

  // Update moving marker position
  useEffect(() => {
    if (!markerRef.current || !points[playIndex]) return;
    const p = points[playIndex];
    markerRef.current.setLngLat([p.longitude, p.latitude]);
    mapRef.current?.panTo([p.longitude, p.latitude], { animate: true, duration: 200 });
  }, [playIndex, points]);

  // Playback
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setPlayIndex(i => {
          if (i >= points.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, 200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, points.length]);

  if (!points.length) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-100 rounded-xl">
        <p className="text-slate-400 text-sm">No location data for this period</p>
      </div>
    );
  }

  const current = points[playIndex];

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Controls bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
        <button
          onClick={() => { setPlayIndex(0); setPlaying(false); }}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 text-sm font-mono"
          title="Reset"
        >
          &#9198;
        </button>
        <button
          onClick={() => setPlaying(p => !p)}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${playing ? 'bg-red-100 text-red-600' : 'bg-blue-600 text-white'}`}
        >
          {playing ? '\u23F8 Pause' : '\u25B6 Play'}
        </button>
        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={points.length - 1}
            value={playIndex}
            onChange={e => { setPlaying(false); setPlayIndex(Number(e.target.value)); }}
            className="w-full"
          />
        </div>
        <div className="text-xs text-slate-500 whitespace-nowrap min-w-[80px] text-right">
          {playIndex + 1} / {points.length}
        </div>
      </div>

      {/* Info strip */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 flex items-center gap-6 text-xs text-slate-600 flex-wrap">
        <span>
          <strong>{new Date(current.timestamp).toLocaleTimeString()}</strong>
        </span>
        <span>{current.latitude.toFixed(5)}, {current.longitude.toFixed(5)}</span>
        {current.speed !== undefined && current.speed !== null && (
          <span>{(current.speed * 3.6).toFixed(1)} km/h</span>
        )}
        {current.batteryLevel !== undefined && current.batteryLevel !== null && (
          <span>Battery: {Math.round(Number(current.batteryLevel) * 100)}%</span>
        )}
      </div>

      {/* Map */}
      <div
        ref={mapContainer}
        className="flex-1 rounded-xl overflow-hidden border border-slate-200"
        style={{ minHeight: 400 }}
      />
    </div>
  );
}
