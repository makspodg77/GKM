import { MutableRefObject, useEffect } from 'react';
import maplibregl from 'maplibre-gl';

export const calculateBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const dLon = lon2 - lon1;
  const y = Math.sin((dLon * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos((dLon * Math.PI) / 180);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
};

export const getMarkerScale = (zoom: number): number => {
  const minZoom = 10;
  const maxZoom = 16;
  const minScale = 0.55;
  const maxScale = 1;

  if (Number.isNaN(zoom)) return maxScale;

  const clampedZoom = Math.min(Math.max(zoom, minZoom), maxZoom);
  const t = (clampedZoom - minZoom) / (maxZoom - minZoom);

  return minScale + t * (maxScale - minScale);
};

export const ensureRouteArrowImage = (
  targetMap: maplibregl.Map,
  imageId: string
) => {
  if (targetMap.hasImage(imageId)) return;

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) return;

  ctx.clearRect(0, 0, size, size);

  ctx.fillStyle = 'rgba(201, 14, 14, 1)';
  ctx.beginPath();
  ctx.moveTo(size / 2, size * 0.1);
  ctx.lineTo(size * 0.85, size * 0.85);
  ctx.lineTo(size * 0.15, size * 0.85);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.08;
  ctx.lineJoin = 'round';
  ctx.stroke();

  const imageData = ctx.getImageData(0, 0, size, size);
  targetMap.addImage(imageId, imageData, { pixelRatio: 2 });
};

export interface ActiveBus {
  departure_route_id: string;
  line_name: string;
  direction: string;
  previous_stop: string;
  vehicle_type_id: number;
  next_stop: string;
  bus_latitude: string;
  bus_longitude: string;
  start_time: string;
  color: string;
  next_waypoint_lat?: string;
  next_waypoint_lon?: string;
}

export type BusMarkerEntry = {
  marker: maplibregl.Marker;
  popup: maplibregl.Popup;
  animationFrameId?: number;
};

export const createBusKey = (routeId: string, startTime: string) =>
  `${routeId}_${startTime}`;

export const parseBusKey = (key: string) => {
  const [routeId, ...rest] = key.split('_');
  return { routeId, startTime: rest.join('_') };
};

interface UseBusMarkersOptions {
  mapLoaded: boolean;
  mapRef: MutableRefObject<maplibregl.Map | null>;
  activeBuses?: ActiveBus[];
  busMarkersRef: MutableRefObject<Map<string, BusMarkerEntry>>;
  selectedBusKey: string | null;
  setSelectedBusKey: (key: string | null) => void;
  popupOpenBusId: string | null;
  setPopupOpenBusId: (key: string | null) => void;
  vehicleIcons: {
    bus: string;
    tram: string;
    train: string;
  };
}

export const useBusMarkers = (options: UseBusMarkersOptions) => {
  const {
    mapLoaded,
    mapRef,
    activeBuses,
    busMarkersRef,
    selectedBusKey,
    setSelectedBusKey,
    popupOpenBusId,
    setPopupOpenBusId,
    vehicleIcons,
  } = options;

  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapLoaded || !mapInstance) return;

    const markerEntries = busMarkersRef.current;

    const cancelEntryAnimation = (entry: BusMarkerEntry) => {
      if (entry.animationFrameId) {
        cancelAnimationFrame(entry.animationFrameId);
        entry.animationFrameId = undefined;
      }
    };

    if (!activeBuses || activeBuses.length === 0) {
      markerEntries.forEach((entry) => {
        cancelEntryAnimation(entry);
        entry.popup.remove();
        entry.marker.remove();
      });
      markerEntries.clear();
      return;
    }

    if (popupOpenBusId) {
      const { routeId: popupRouteId, startTime: popupStartTime } =
        parseBusKey(popupOpenBusId);

      const busStillExists = activeBuses.some(
        (bus) =>
          bus.departure_route_id === popupRouteId &&
          bus.start_time === popupStartTime
      );

      if (!busStillExists) {
        setPopupOpenBusId(null);
      }
    }

    if (selectedBusKey) {
      const busStillExists = activeBuses.some(
        (bus) =>
          createBusKey(bus.departure_route_id, bus.start_time) ===
          selectedBusKey
      );
      if (!busStillExists) {
        setSelectedBusKey(null);
      }
    }

    const seenKeys = new Set<string>();

    const smoothMoveMarker = (
      entry: BusMarkerEntry,
      target: [number, number],
      shouldUpdatePopup: boolean
    ) => {
      cancelEntryAnimation(entry);
      const startLngLat = entry.marker.getLngLat();
      const fromLng = startLngLat.lng;
      const fromLat = startLngLat.lat;
      const [toLng, toLat] = target;
      const duration = 400;
      const startTime = performance.now();

      const step = (timestamp: number) => {
        const progress = Math.min(1, (timestamp - startTime) / duration);
        const lng = fromLng + (toLng - fromLng) * progress;
        const lat = fromLat + (toLat - fromLat) * progress;
        const position: [number, number] = [lng, lat];
        entry.marker.setLngLat(position);
        if (shouldUpdatePopup) {
          entry.popup.setLngLat(position);
        }

        if (progress < 1) {
          entry.animationFrameId = requestAnimationFrame(step);
        } else {
          entry.animationFrameId = undefined;
          entry.marker.setLngLat(target);
          if (shouldUpdatePopup) {
            entry.popup.setLngLat(target);
          }
        }
      };

      entry.animationFrameId = requestAnimationFrame(step);
    };

    activeBuses.forEach((bus) => {
      if (!bus.bus_latitude || !bus.bus_longitude) return;

      const busLat = parseFloat(bus.bus_latitude);
      const busLon = parseFloat(bus.bus_longitude);
      if (!Number.isFinite(busLat) || !Number.isFinite(busLon)) return;

      const busCoordinates: [number, number] = [busLon, busLat];
      const uniqueBusKey = createBusKey(bus.departure_route_id, bus.start_time);

      seenKeys.add(uniqueBusKey);

      const markerEntry = markerEntries.get(uniqueBusKey);
      const bearing =
        bus.next_waypoint_lat && bus.next_waypoint_lon
          ? calculateBearing(
              busLat,
              busLon,
              parseFloat(bus.next_waypoint_lat),
              parseFloat(bus.next_waypoint_lon)
            )
          : 0;
      const currentZoom = mapInstance.getZoom();
      const currentMapBearing = mapInstance.getBearing();
      const markerScale = getMarkerScale(currentZoom);

      const getVehicleIcon = (vehicleTypeId: number) => {
        if (vehicleTypeId === 1) return vehicleIcons.bus;
        if (vehicleTypeId === 2) return vehicleIcons.tram;
        return vehicleIcons.train;
      };
      const iconUrl = getVehicleIcon(bus.vehicle_type_id);

      const popupHtml = `
          <div class="stop-popup">
            <div class="bus-popup-name">
              <img class="bus-icon" src="${iconUrl}" alt="icon" style="width: 24px; height: 24px; vertical-align: middle;" />
              ${bus.line_name} <div class="arrow">&gt;</div> ${bus.direction}
            </div>
            <div class="stop-popup-number">
              <div class="stops">
                <div>
                  <div class="prevstop"></div>${bus.previous_stop}
                </div>
                <div>
                  <div class="nextstop"></div>${bus.next_stop}
                </div>
                <span>Operator: PKS Kamień Pomorski</span>
              </div>
            </div>
          </div>
        `;

      const handleMarkerClick = (e: MouseEvent) => {
        e.stopPropagation();

        const isCurrentlySelected = selectedBusKey === uniqueBusKey;
        const isPopupOpen = popupOpenBusId === uniqueBusKey;

        if (isCurrentlySelected && isPopupOpen) {
          setSelectedBusKey(null);
          setPopupOpenBusId(null);
        } else {
          setSelectedBusKey(uniqueBusKey);
          setPopupOpenBusId(uniqueBusKey);

          mapInstance.easeTo({
            center: busCoordinates,
            duration: 600,
          });
        }
      };

      if (markerEntry) {
        const element = markerEntry.marker.getElement();
        element.style.setProperty('--bearing', `${bearing}deg`);
        element.style.setProperty('--marker-scale', `${markerScale}`);
        element.style.setProperty('--map-bearing', `${currentMapBearing}deg`);

        const markerDiv = element.querySelector(
          '.bus-marker'
        ) as HTMLElement | null;
        if (markerDiv) {
          markerDiv.style.borderColor = bus.color;
          markerDiv.innerHTML = `<span>${bus.line_name}</span>`;

          if (selectedBusKey === uniqueBusKey) {
            markerDiv.style.borderWidth = '3px';
            markerDiv.style.boxShadow =
              '0 0 0 2px #ffffff, 0 0 10px rgba(255, 215, 0, 0.8)';
          } else {
            markerDiv.style.borderWidth = '2px';
            markerDiv.style.boxShadow = '0 0 0 2px #ffffff';
          }
        }

        element.onclick = handleMarkerClick;

        markerEntry.popup.setHTML(popupHtml);

        smoothMoveMarker(
          markerEntry,
          busCoordinates,
          popupOpenBusId === uniqueBusKey
        );
      } else {
        const el = document.createElement('div');
        el.className = 'bus-marker-container';
        el.style.setProperty('--bearing', `${bearing}deg`);
        el.style.setProperty('--marker-scale', `${markerScale}`);
        el.style.setProperty('--map-bearing', `${currentMapBearing}deg`);

        const markerDiv = document.createElement('div');
        markerDiv.className = 'bus-marker';
        markerDiv.style.borderColor = bus.color;
        markerDiv.innerHTML = `<span>${bus.line_name}</span>`;

        if (selectedBusKey === uniqueBusKey) {
          markerDiv.style.borderWidth = '3px';
          markerDiv.style.boxShadow =
            '0 0 0 2px #ffffff, 0 0 10px rgba(255, 215, 0, 0.8)';
        } else {
          markerDiv.style.borderWidth = '2px';
          markerDiv.style.boxShadow = '0 0 0 2px #ffffff';
        }

        const arrowDiv = document.createElement('div');
        arrowDiv.className = 'bus-marker-arrow';

        el.appendChild(arrowDiv);
        el.appendChild(markerDiv);

        el.onclick = handleMarkerClick;

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
          pitchAlignment: 'map',
        })
          .setLngLat(busCoordinates)
          .addTo(mapInstance);

        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: 'custom-map-popup bus-popup',
          anchor: 'bottom',
          offset: [0, -40],
        })
          .setLngLat(busCoordinates)
          .setHTML(popupHtml);

        markerEntries.set(uniqueBusKey, {
          marker,
          popup,
        });
      }
    });

    markerEntries.forEach((entry, key) => {
      if (!seenKeys.has(key)) {
        cancelEntryAnimation(entry);
        entry.popup.remove();
        entry.marker.remove();
        markerEntries.delete(key);
      }
    });

    markerEntries.forEach((entry) => {
      entry.popup.remove();
    });

    if (popupOpenBusId) {
      const entry = markerEntries.get(popupOpenBusId);
      if (entry) {
        entry.popup.setLngLat(entry.marker.getLngLat()).addTo(mapInstance);
      }
    }
  }, [
    mapLoaded,
    mapRef,
    activeBuses,
    busMarkersRef,
    selectedBusKey,
    setSelectedBusKey,
    popupOpenBusId,
    setPopupOpenBusId,
    vehicleIcons,
  ]);
};
