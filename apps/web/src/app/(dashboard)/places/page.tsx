'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/ui/Header';
import api from '@/lib/api';
import { Plus, Trash2, Building2, MapPin, X } from 'lucide-react';
import mapboxgl from 'mapbox-gl';

interface Place {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  category: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
}

const CATEGORIES = ['client', 'warehouse', 'office', 'site', 'other'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_COLORS: Record<string, string> = {
  client: '#3b82f6',
  warehouse: '#f59e0b',
  office: '#10b981',
  site: '#ef4444',
  other: '#8b5cf6',
};

const CATEGORY_LABELS: Record<string, string> = {
  client: 'Client',
  warehouse: 'Warehouse',
  office: 'Office',
  site: 'Site',
  other: 'Other',
};

interface PlaceFormData {
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  category: Category | '';
  color: string;
}

const DEFAULT_FORM: PlaceFormData = {
  name: '',
  description: '',
  address: '',
  city: '',
  country: '',
  latitude: '',
  longitude: '',
  radiusMeters: 200,
  category: '',
  color: '#3b82f6',
};

export default function PlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<PlaceFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: mapboxgl.Marker; circleId: string }>>(new Map());
  const mapInitialized = useRef(false);

  // --- Data fetching ---
  const fetchPlaces = useCallback(async () => {
    try {
      const res = await api.get<Place[]>('/places');
      setPlaces(res.data);
    } catch (err) {
      console.error('Failed to load places:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  // --- Map initialization ---
  useEffect(() => {
    if (!mapContainer.current || mapInitialized.current) return;
    mapInitialized.current = true;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    if (!token) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [0, 20],
      zoom: 2,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      mapInitialized.current = false;
    };
  }, []);

  // --- Sync places to map ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const addPlacesToMap = () => {
      // Remove old markers and layers
      markersRef.current.forEach(({ marker, circleId }) => {
        marker.remove();
        if (map.getLayer(circleId)) map.removeLayer(circleId);
        if (map.getLayer(`${circleId}-border`)) map.removeLayer(`${circleId}-border`);
        if (map.getSource(circleId)) map.removeSource(circleId);
      });
      markersRef.current.clear();

      places.forEach((place) => {
        const color = place.color || CATEGORY_COLORS[place.category ?? 'other'] || '#3b82f6';
        const circleId = `place-circle-${place.id}`;

        // Add radius circle as GeoJSON source + layer
        if (map.isStyleLoaded()) {
          // Generate circle polygon approximation
          const points = 64;
          const R = 6371000; // Earth radius in meters
          const lat = Number(place.latitude);
          const lng = Number(place.longitude);
          const coords: [number, number][] = [];

          for (let i = 0; i <= points; i++) {
            const angle = (i / points) * 2 * Math.PI;
            const dLat = (place.radiusMeters / R) * (180 / Math.PI) * Math.cos(angle);
            const dLng =
              ((place.radiusMeters / R) * (180 / Math.PI) * Math.sin(angle)) /
              Math.cos((lat * Math.PI) / 180);
            coords.push([lng + dLng, lat + dLat]);
          }

          try {
            map.addSource(circleId, {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [coords] },
                properties: {},
              },
            });

            map.addLayer({
              id: circleId,
              type: 'fill',
              source: circleId,
              paint: {
                'fill-color': color,
                'fill-opacity': 0.12,
              },
            });

            map.addLayer({
              id: `${circleId}-border`,
              type: 'line',
              source: circleId,
              paint: {
                'line-color': color,
                'line-width': 2,
                'line-opacity': 0.7,
              },
            });
          } catch {
            // Source/layer might already exist — ignore
          }
        }

        // Create marker element
        const el = document.createElement('div');
        el.style.cssText = `
          width: 28px;
          height: 28px;
          border-radius: 50% 50% 50% 0;
          background: ${color};
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transform: rotate(-45deg);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        `;

        const popup = new mapboxgl.Popup({ offset: 20, closeButton: false })
          .setHTML(
            `<div style="font-size:13px;line-height:1.4;min-width:140px;">
              <p style="font-weight:600;margin:0 0 2px">${place.name}</p>
              ${place.category ? `<p style="margin:0;color:#64748b;text-transform:capitalize;">${place.category}</p>` : ''}
              ${place.address ? `<p style="margin:4px 0 0;color:#94a3b8;font-size:11px;">${place.address}</p>` : ''}
              <p style="margin:4px 0 0;color:#94a3b8;font-size:11px;">${place.radiusMeters}m radius</p>
            </div>`,
          );

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([Number(place.longitude), Number(place.latitude)])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.set(place.id, { marker, circleId });
      });
    };

    if (map.isStyleLoaded()) {
      addPlacesToMap();
    } else {
      map.once('load', addPlacesToMap);
    }
  }, [places]);

  // --- Fly to place ---
  const flyToPlace = useCallback((place: Place) => {
    const map = mapRef.current;
    if (!map) return;
    setSelectedPlaceId(place.id);
    map.flyTo({
      center: [Number(place.longitude), Number(place.latitude)],
      zoom: 15,
      duration: 1000,
    });
    const entry = markersRef.current.get(place.id);
    if (entry) {
      entry.marker.togglePopup();
    }
  }, []);

  // --- Delete place ---
  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this place?')) return;
    try {
      await api.delete(`/places/${id}`);
      setPlaces((prev) => prev.filter((p) => p.id !== id));
      if (selectedPlaceId === id) setSelectedPlaceId(null);
    } catch (err) {
      console.error('Failed to delete place:', err);
    }
  }, [selectedPlaceId]);

  // --- Form submission ---
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (isNaN(lat) || lat < -90 || lat > 90) { setFormError('Latitude must be between -90 and 90'); return; }
    if (isNaN(lng) || lng < -180 || lng > 180) { setFormError('Longitude must be between -180 and 180'); return; }

    setSaving(true);
    try {
      await api.post('/places', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        country: form.country.trim() || undefined,
        latitude: lat,
        longitude: lng,
        radiusMeters: form.radiusMeters,
        category: form.category || undefined,
        color: form.color,
      });
      await fetchPlaces();
      setShowModal(false);
      setForm(DEFAULT_FORM);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to save place');
    } finally {
      setSaving(false);
    }
  }, [form, fetchPlaces]);

  // --- Filtered places ---
  const filteredPlaces = activeCategory === 'all'
    ? places
    : places.filter((p) => p.category === activeCategory);

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Places"
        subtitle="Named client locations for check-ins and job assignments"
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Place
          </button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
          {/* Category filter tabs */}
          <div className="px-3 py-2.5 border-b border-slate-100 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                All ({places.length})
              </button>
              {CATEGORIES.map((cat) => {
                const count = places.filter((p) => p.category === cat).length;
                if (count === 0) return null;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeCategory === cat
                        ? 'text-white'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                    style={activeCategory === cat ? { backgroundColor: CATEGORY_COLORS[cat] } : {}}
                  >
                    {CATEGORY_LABELS[cat]} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Places list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg border border-slate-100 p-3 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPlaces.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No places yet.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click{' '}
                  <span className="font-medium text-blue-500">&ldquo;Add Place&rdquo;</span> to create one.
                </p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {filteredPlaces.map((place) => {
                  const color = place.color || CATEGORY_COLORS[place.category ?? 'other'] || '#3b82f6';
                  const isSelected = selectedPlaceId === place.id;
                  return (
                    <div
                      key={place.id}
                      onClick={() => flyToPlace(place)}
                      className={`rounded-lg border p-3 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all group ${
                        isSelected ? 'border-blue-300 bg-blue-50' : 'border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Color dot */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${color}20` }}
                        >
                          <MapPin className="w-4 h-4" style={{ color }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{place.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {place.category && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded-md font-medium capitalize"
                                style={{ backgroundColor: `${color}20`, color }}
                              >
                                {CATEGORY_LABELS[place.category] ?? place.category}
                              </span>
                            )}
                            {place.address && (
                              <span className="text-xs text-slate-400 truncate">{place.address}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{place.radiusMeters}m radius</p>
                        </div>

                        <button
                          onClick={(e) => handleDelete(place.id, e)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                          aria-label="Delete place"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: map */}
        <div className="flex-1 relative overflow-hidden">
          <div ref={mapContainer} className="absolute inset-0" />
          {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
              <p className="text-sm text-slate-500">Mapbox token not configured</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Place Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Add Place</h2>
              <button
                onClick={() => { setShowModal(false); setForm(DEFAULT_FORM); setFormError(''); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              {formError && (
                <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Acme Corp HQ"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="123 Main Street"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* City / Country */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="New York"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                    placeholder="US"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Lat / Lng */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Latitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                    placeholder="40.7128"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Longitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                    placeholder="-74.0060"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Radius slider */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Check-in Radius: <span className="font-semibold text-blue-600">{form.radiusMeters}m</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={10000}
                  step={10}
                  value={form.radiusMeters}
                  onChange={(e) => setForm((f) => ({ ...f, radiusMeters: Number(e.target.value) }))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                  <span>10m</span>
                  <span>10km</span>
                </div>
              </div>

              {/* Category + Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => {
                      const cat = e.target.value as Category | '';
                      setForm((f) => ({
                        ...f,
                        category: cat,
                        color: cat ? CATEGORY_COLORS[cat] : f.color,
                      }));
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">— None —</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Pin Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                      className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                    <span className="text-xs text-slate-500 font-mono">{form.color}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional notes about this location..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(DEFAULT_FORM); setFormError(''); }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-primary disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Place'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
