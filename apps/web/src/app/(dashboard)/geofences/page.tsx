'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/ui/Header';
import { GeofenceDrawer } from '@/components/map/GeofenceDrawer';
import api from '@/lib/api';
import { GeofenceType } from '@fieldops/shared';
import {
  Plus,
  CircleDot,
  Pentagon,
  Trash2,
  MapPin,
  MousePointer2,
  CircleIcon,
  ArrowRight,
} from 'lucide-react';

interface GeofenceData {
  id: string;
  name: string;
  type: GeofenceType;
  centerLatitude?: number | null;
  centerLongitude?: number | null;
  radiusMeters?: number | null;
  polygonCoordinates?: Array<{ latitude: number; longitude: number }> | null;
  isActive: boolean;
  createdAt: string;
}

const GEOFENCE_HELP = [
  {
    icon: '🗺️',
    title: 'What is a geofence?',
    text: 'A geofence is a virtual boundary drawn on the map. When a worker enters or leaves the zone, the system automatically records a check-in or check-out event.',
  },
  {
    icon: '🔷',
    title: 'Polygon mode',
    text: 'Click "Polygon", then click multiple points on the map to draw a custom shape. At least 3 points are needed. Great for irregular areas like job sites or building perimeters.',
  },
  {
    icon: '🔵',
    title: 'Circle mode',
    text: 'Click "Circle", then click the map to set the center point. Use the radius slider (10m – 5000m) to set the zone size. Perfect for warehouses, depots, or single addresses.',
  },
  {
    icon: '💾',
    title: 'Saving a geofence',
    text: 'Enter a name in the text field, draw your shape, then click Save. The geofence becomes active immediately and will appear in the list.',
  },
  {
    icon: '✅',
    title: 'Auto check-in / check-out',
    text: 'Once a geofence is active, any worker carrying the mobile app will be automatically checked in when they enter the zone and checked out when they leave.',
  },
];

export default function GeofencesPage() {
  const [geofences, setGeofences] = useState<GeofenceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);

  const fetchGeofences = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<GeofenceData[]>('/geofences');
      setGeofences(res.data);
    } catch (err) {
      console.error('Failed to load geofences:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGeofences();
  }, [fetchGeofences]);

  const handleSaveGeofence = async (
    data: Parameters<typeof GeofenceDrawer>[0]['onSave'] extends (...args: infer A) => unknown
      ? A[0]
      : never,
  ) => {
    await api.post('/geofences', data);
    await fetchGeofences();
    setShowDrawer(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this geofence?')) return;
    await api.delete(`/geofences/${id}`);
    setGeofences((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <div>
      <Header
        title="Geofences"
        subtitle="Draw virtual boundaries for automatic worker check-in / check-out"
        helpItems={GEOFENCE_HELP}
        actions={
          <button
            onClick={() => setShowDrawer(!showDrawer)}
            className={showDrawer ? 'btn-secondary' : 'btn-primary'}
          >
            {showDrawer ? (
              'Cancel'
            ) : (
              <>
                <Plus className="w-4 h-4" />
                New Geofence
              </>
            )}
          </button>
        }
      />

      <div className="flex h-[calc(100vh-65px)]">
        {/* ── Left panel: list + instructions ── */}
        <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto">

          {/* Drawing instructions — shown when drawer is open */}
          {showDrawer && (
            <div className="p-4 border-b border-slate-200 bg-blue-50">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">
                How to draw a geofence
              </p>
              <div className="space-y-2.5">
                <div className="flex gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">1</div>
                  <p className="text-xs text-slate-600">Enter a <span className="font-semibold">name</span> for the zone in the text field on the map.</p>
                </div>
                <div className="flex gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">2</div>
                  <p className="text-xs text-slate-600">Choose a shape:</p>
                </div>
                <div className="ml-7 space-y-2">
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-white border border-blue-200">
                    <MousePointer2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Polygon</p>
                      <p className="text-xs text-slate-500">Click the map to place corner points. Needs at least 3 points.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-white border border-orange-200">
                    <CircleIcon className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Circle</p>
                      <p className="text-xs text-slate-500">Click the map to set the center, then use the slider to adjust the radius.</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">3</div>
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    Click <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold">Save</span> to activate the geofence.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Geofence count */}
          <div className="p-3 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {geofences.length} Zone{geofences.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Geofence list */}
          {loading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-100 p-3 animate-pulse"
                >
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
          ) : geofences.length === 0 ? (
            <div className="p-8 text-center">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No geofences yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Click <span className="font-medium text-blue-500">&ldquo;New Geofence&rdquo;</span> to create one.
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {geofences.map((gf) => (
                <div
                  key={gf.id}
                  className="rounded-lg border border-slate-100 p-3 hover:border-slate-200 hover:bg-slate-50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    {/* Type icon */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                        ${gf.type === GeofenceType.CIRCLE ? 'bg-orange-50' : 'bg-blue-50'}`}
                    >
                      {gf.type === GeofenceType.CIRCLE ? (
                        <CircleDot className="w-4 h-4 text-orange-500" />
                      ) : (
                        <Pentagon className="w-4 h-4 text-blue-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {gf.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`badge text-xs ${
                            gf.type === GeofenceType.CIRCLE
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          {gf.type}
                        </span>
                        <span className="text-xs text-slate-400">
                          {gf.type === GeofenceType.CIRCLE && gf.radiusMeters
                            ? `${gf.radiusMeters}m radius`
                            : gf.type === GeofenceType.POLYGON && gf.polygonCoordinates
                            ? `${gf.polygonCoordinates.length} points`
                            : ''}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(gf.id)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Delete geofence"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Active indicator */}
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        gf.isActive ? 'bg-green-500' : 'bg-slate-300'
                      }`}
                    />
                    <span className="text-xs text-slate-400">
                      {gf.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right panel: map (single instance) ── */}
        <div className="flex-1 bg-slate-100 relative overflow-hidden">
          {!showDrawer ? (
            /* Empty state */
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-sm px-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-base font-semibold text-slate-700 mb-1">
                  No geofence selected
                </p>
                <p className="text-sm text-slate-400 mb-5">
                  Create a new geofence to draw a virtual zone on the map.
                  Workers will be automatically checked in/out when they enter or leave.
                </p>
                <button
                  onClick={() => setShowDrawer(true)}
                  className="btn-primary mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  New Geofence
                </button>

                {/* Quick how-to */}
                <div className="mt-8 text-left space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Quick guide</p>
                  {[
                    { icon: '🔷', label: 'Polygon', desc: 'Click points to draw any shape' },
                    { icon: '🔵', label: 'Circle', desc: 'Set center + adjust radius slider' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-base">{item.icon}</span>
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                        <ArrowRight className="w-3 h-3 text-slate-300 inline mx-1" />
                        <span className="text-xs text-slate-500">{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* GeofenceDrawer — rendered ONCE here only (has its own map) */
            <div className="absolute inset-0">
              <GeofenceDrawer
                onSave={handleSaveGeofence}
                existingGeofences={geofences}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
