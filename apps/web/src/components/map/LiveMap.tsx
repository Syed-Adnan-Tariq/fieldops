'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/auth.store';
import { SOCKET_EVENTS, LiveLocationUpdate, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '@fieldops/shared';
import { WorkerData } from '@/hooks/useWorkers';
import api from '@/lib/api';

interface LiveMapProps {
  initialWorkers?: WorkerData[];
  className?: string;
}

interface MarkerData {
  marker: mapboxgl.Marker;
  popup: mapboxgl.Popup;
}

export function LiveMap({ initialWorkers = [], className = '' }: LiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerData>>(new Map());
  const [workerLocations, setWorkerLocations] = useState<Map<string, LiveLocationUpdate>>(new Map());
  const { accessToken } = useAuthStore();
  const { on, isConnected } = useSocket();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    if (!token) {
      console.error('Mapbox token is not configured');
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: MAP_DEFAULT_CENTER,
      zoom: MAP_DEFAULT_ZOOM,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(
      new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }),
      'top-right',
    );

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Helper: create or update worker marker
  const upsertMarker = useCallback(
    (workerId: string, latitude: number, longitude: number, workerName: string, status: string) => {
      const map = mapRef.current;
      if (!map) return;

      const existing = markersRef.current.get(workerId);
      const lngLat: mapboxgl.LngLatLike = [longitude, latitude];

      if (existing) {
        existing.marker.setLngLat(lngLat);
        existing.popup.setHTML(buildPopupHtml(workerName, status, latitude, longitude));
      } else {
        const el = document.createElement('div');
        el.className = `worker-marker ${status}`;
        el.title = workerName;

        const popup = new mapboxgl.Popup({ offset: 20, closeButton: false })
          .setHTML(buildPopupHtml(workerName, status, latitude, longitude));

        const marker = new mapboxgl.Marker(el)
          .setLngLat(lngLat)
          .setPopup(popup)
          .addTo(map);

        el.addEventListener('click', () => popup.addTo(map));
        markersRef.current.set(workerId, { marker, popup });
      }
    },
    [],
  );

  const buildPopupHtml = (
    name: string,
    status: string,
    lat: number,
    lng: number,
  ) => `
    <div class="geofence-popup">
      <p class="font-semibold text-gray-900">${name}</p>
      <p class="text-xs text-gray-500 capitalize mt-0.5">${status.replace('_', ' ')}</p>
      <p class="text-xs text-gray-400 mt-1">${lat.toFixed(5)}, ${lng.toFixed(5)}</p>
    </div>
  `;

  // Load initial workers
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const onLoad = () => {
      initialWorkers.forEach((w) => {
        if (w.currentLatitude && w.currentLongitude) {
          upsertMarker(
            w.id,
            w.currentLatitude,
            w.currentLongitude,
            `${w.firstName} ${w.lastName}`,
            w.status ?? 'offline',
          );
        }
      });
    };
    if (map.loaded()) {
      onLoad();
    } else {
      map.on('load', onLoad);
      return () => { map.off('load', onLoad); };
    }
  }, [initialWorkers, upsertMarker]);

  // Subscribe to real-time location updates
  useEffect(() => {
    const removeListener = on(
      SOCKET_EVENTS.LOCATION_BROADCAST,
      (data: unknown) => {
        const update = data as LiveLocationUpdate;
        setWorkerLocations((prev) => {
          const next = new Map(prev);
          next.set(update.workerId, update);
          return next;
        });
        upsertMarker(
          update.workerId,
          update.latitude,
          update.longitude,
          update.workerName,
          update.status,
        );
      },
    );
    return removeListener;
  }, [on, upsertMarker]);

  // Fetch active workers with locations from API
  useEffect(() => {
    if (!accessToken) return;
    api
      .get<WorkerData[]>('/users/workers/active')
      .then((res) => {
        res.data.forEach((w) => {
          if (w.currentLatitude && w.currentLongitude) {
            upsertMarker(
              w.id,
              w.currentLatitude,
              w.currentLongitude,
              `${w.firstName} ${w.lastName}`,
              w.status ?? 'offline',
            );
          }
        });
      })
      .catch(console.error);
  }, [accessToken, upsertMarker]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-xl overflow-hidden" />

      {/* Connection status */}
      <div className="absolute top-3 left-3 z-10">
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm
            ${isConnected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}
          />
          {isConnected ? 'Live' : 'Reconnecting'}
        </div>
      </div>

      {/* Worker count */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200">
        <p className="text-xs text-gray-500">
          Tracking <span className="font-bold text-gray-900">{workerLocations.size}</span> workers live
        </p>
      </div>
    </div>
  );
}
