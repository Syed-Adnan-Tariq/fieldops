'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, GeofenceType } from '@fieldops/shared';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface GeofenceDrawerProps {
  onSave: (data: {
    name: string;
    type: GeofenceType;
    centerLatitude?: number;
    centerLongitude?: number;
    radiusMeters?: number;
    polygonCoordinates?: Coordinate[];
  }) => Promise<void>;
  existingGeofences?: Array<{
    id: string;
    name: string;
    type: GeofenceType;
    centerLatitude?: number | null;
    centerLongitude?: number | null;
    radiusMeters?: number | null;
    polygonCoordinates?: Coordinate[] | null;
  }>;
}

type DrawMode = 'none' | 'polygon' | 'circle';

/** Approximate a circle as a GeoJSON polygon (64 points). */
function generateCircleGeoJSON(
  center: [number, number],
  radiusMeters: number,
  numPoints = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lng, lat] = center;
  const earthRadius = 6371000;
  const dLat = (radiusMeters / earthRadius) * (180 / Math.PI);
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  const coords: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const angle = (i * 2 * Math.PI) / numPoints;
    coords.push([lng + dLng * Math.sin(angle), lat + dLat * Math.cos(angle)]);
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coords] },
  };
}

export function GeofenceDrawer({ onSave, existingGeofences = [] }: GeofenceDrawerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>('none');
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);
  const [circleCenterMarker, setCircleCenterMarker] = useState<mapboxgl.Marker | null>(null);
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);
  const [radiusMeters, setRadiusMeters] = useState(200);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const pointMarkersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    if (!token) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: MAP_DEFAULT_CENTER,
      zoom: MAP_DEFAULT_ZOOM,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      // Draw existing geofences
      existingGeofences.forEach((gf, i) => {
        if (gf.type === GeofenceType.POLYGON && gf.polygonCoordinates?.length) {
          const coords = gf.polygonCoordinates.map((c) => [c.longitude, c.latitude] as [number, number]);
          coords.push(coords[0]);
          map.addSource(`gf-${i}`, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: { name: gf.name },
              geometry: { type: 'Polygon', coordinates: [coords] },
            },
          });
          map.addLayer({
            id: `gf-fill-${i}`,
            type: 'fill',
            source: `gf-${i}`,
            paint: { 'fill-color': '#3B82F6', 'fill-opacity': 0.15 },
          });
          map.addLayer({
            id: `gf-line-${i}`,
            type: 'line',
            source: `gf-${i}`,
            paint: { 'line-color': '#3B82F6', 'line-width': 2 },
          });
        }
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const clearDraw = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setPolygonPoints([]);
    setCircleCenter(null);
    pointMarkersRef.current.forEach((m) => m.remove());
    pointMarkersRef.current = [];
    circleCenterMarker?.remove();
    setCircleCenterMarker(null);
    if (map.getSource('draw-polygon')) {
      map.removeLayer('draw-polygon-fill');
      map.removeLayer('draw-polygon-line');
      map.removeSource('draw-polygon');
    }
    if (map.getSource('draw-circle')) {
      map.removeLayer('draw-circle-fill');
      map.removeLayer('draw-circle-line');
      map.removeSource('draw-circle');
    }
  }, [circleCenterMarker]);

  const handleMapClick = useCallback(
    (e: mapboxgl.MapMouseEvent) => {
      const map = mapRef.current;
      if (!map || drawMode === 'none') return;

      const lng = e.lngLat.lng;
      const lat = e.lngLat.lat;

      if (drawMode === 'polygon') {
        const newPoints: [number, number][] = [...polygonPoints, [lng, lat]];
        setPolygonPoints(newPoints);

        const el = document.createElement('div');
        el.className = 'w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow';
        const m = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map);
        pointMarkersRef.current.push(m);

        if (newPoints.length >= 3) {
          const closed = [...newPoints, newPoints[0]];
          const geojson: GeoJSON.Feature<GeoJSON.Polygon> = {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: [closed] },
          };
          if (map.getSource('draw-polygon')) {
            (map.getSource('draw-polygon') as mapboxgl.GeoJSONSource).setData(geojson);
          } else {
            map.addSource('draw-polygon', { type: 'geojson', data: geojson });
            map.addLayer({ id: 'draw-polygon-fill', type: 'fill', source: 'draw-polygon', paint: { 'fill-color': '#3B82F6', 'fill-opacity': 0.2 } });
            map.addLayer({ id: 'draw-polygon-line', type: 'line', source: 'draw-polygon', paint: { 'line-color': '#3B82F6', 'line-width': 2 } });
          }
        }
      } else if (drawMode === 'circle') {
        circleCenterMarker?.remove();
        const el = document.createElement('div');
        el.className = 'w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow';
        const m = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map);
        setCircleCenterMarker(m);
        setCircleCenter([lng, lat]);
      }
    },
    [drawMode, polygonPoints, circleCenterMarker],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.on('click', handleMapClick);
    return () => { map.off('click', handleMapClick); };
  }, [handleMapClick]);

  // Redraw circle whenever center or radius changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      if (!circleCenter) {
        if (map.getSource('draw-circle')) {
          map.removeLayer('draw-circle-fill');
          map.removeLayer('draw-circle-line');
          map.removeSource('draw-circle');
        }
        return;
      }
      const geojson = generateCircleGeoJSON(circleCenter, radiusMeters);
      if (map.getSource('draw-circle')) {
        (map.getSource('draw-circle') as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        map.addSource('draw-circle', { type: 'geojson', data: geojson });
        map.addLayer({ id: 'draw-circle-fill', type: 'fill', source: 'draw-circle', paint: { 'fill-color': '#F97316', 'fill-opacity': 0.2 } });
        map.addLayer({ id: 'draw-circle-line', type: 'line', source: 'draw-circle', paint: { 'line-color': '#F97316', 'line-width': 2.5 } });
      }
    };

    if (map.isStyleLoaded()) {
      draw();
    } else {
      map.once('load', draw);
    }
  }, [circleCenter, radiusMeters]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a geofence name');
      return;
    }
    setSaving(true);
    try {
      if (drawMode === 'polygon' && polygonPoints.length >= 3) {
        await onSave({
          name: name.trim(),
          type: GeofenceType.POLYGON,
          polygonCoordinates: polygonPoints.map(([lng, lat]) => ({
            latitude: lat,
            longitude: lng,
          })),
        });
      } else if (drawMode === 'circle' && circleCenter) {
        await onSave({
          name: name.trim(),
          type: GeofenceType.CIRCLE,
          centerLatitude: circleCenter[1],
          centerLongitude: circleCenter[0],
          radiusMeters,
        });
      } else {
        alert('Please draw a geofence first');
        return;
      }
      setName('');
      clearDraw();
      setDrawMode('none');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Draw Geofence</h3>
        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Geofence name"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { clearDraw(); setDrawMode('polygon'); }}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border font-medium transition
                ${drawMode === 'polygon' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Polygon
            </button>
            <button
              onClick={() => { clearDraw(); setDrawMode('circle'); }}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border font-medium transition
                ${drawMode === 'circle' ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Circle
            </button>
          </div>
          {drawMode === 'circle' && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Radius: {radiusMeters}m
              </label>
              <input
                type="range"
                min={10}
                max={5000}
                step={10}
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
          {drawMode === 'polygon' && (
            <p className="text-xs text-gray-400">
              Click on the map to add polygon vertices ({polygonPoints.length} points)
            </p>
          )}
          {drawMode === 'circle' && !circleCenter && (
            <p className="text-xs text-gray-400">Click on the map to set the circle center</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={clearDraw}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Clear
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div ref={mapContainer} className="flex-1 rounded-xl overflow-hidden border border-gray-200" style={{ minHeight: 400 }} />
    </div>
  );
}
