import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './SingleStopMap.css';

interface SingleStopMapProps {
  coordinates: string; // Format: "14.772366427918241, 53.459639038129296"
  name: string;
  street?: string;
  stopId?: string | number;
  isOnRequest?: boolean;
  color?: string;
  zoom?: number;
}

/**
 * SingleStopMap - Displays a map centered on a single transit stop
 */
const SingleStopMap = ({
  coordinates,
  name,
  street = '',
  stopId = '',
  isOnRequest = false,
  color = '#e74c3c',
  zoom = 15,
}: SingleStopMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Parse coordinates from string format
  const parseCoordinates = (coords: string): [number, number] => {
    try {
      const [lng, lat] = coords
        .split(',')
        .map((coord) => parseFloat(coord.trim()));
      if (isNaN(lng) || isNaN(lat)) {
        throw new Error('Invalid coordinates');
      }
      return [lng, lat];
    } catch (error) {
      console.error('Error parsing coordinates:', error);
      return [14.77, 53.46]; // Default coordinates (Goleniów)
    }
  };

  const [lng, lat] = parseCoordinates(coordinates);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [lng, lat],
        zoom: zoom,
      });

      map.current.on('load', () => {
        setMapLoaded(true);
      });
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapContainer, lng, lat, zoom]);

  // Add marker when map is loaded
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    // Add marker for the stop
    new maplibregl.Marker({
      color: color,
      scale: 1.2, // Slightly larger than default
    })
      .setLngLat([lng, lat])
      .setPopup(
        new maplibregl.Popup({
          offset: 25,
          closeButton: false,
        }).setHTML(
          `<div class="stop-popup">
            <strong>${name}</strong>
            ${street ? `<div class="street">${street}</div>` : ''}
            ${stopId ? `<div class="stop-id">Przystanek #${stopId}</div>` : ''}
            ${isOnRequest ? '<div class="on-request">Na żądanie</div>' : ''}
          </div>`
        )
      )
      .addTo(map.current);

    // Add circle to highlight the stop area
    map.current.addSource('stop-area', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        properties: {},
      },
    });
  }, [mapLoaded, lng, lat, color, name, street, stopId, isOnRequest]);

  return (
    <div className="single-stop-map-container">
      <div ref={mapContainer} className="single-stop-map" />
    </div>
  );
};

export default SingleStopMap;
