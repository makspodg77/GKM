import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapRouteDisplay.css';
import { Stop } from '../../services/db';

interface MapRouteDisplayProps {
  routes: Stop[][];
  colors?: string[];
  fitBounds?: boolean;
}

/**
 * MapRouteDisplay - Renders a map with route waypoints and connecting lines
 *
 * @param {MapRouteDisplayProps} props - Component properties
 * @param {Stop[][]} props.routes - Array of routes (each route is an array of stops)
 * @param {string[]} props.colors - Array of colors for each route (defaults to ["#e74c3c", "#3498db"])
 * @param {boolean} props.fitBounds - Whether to fit the map bounds to the routes (default: true)
 */
const MapRouteDisplay = ({
  routes,
  colors = ['#e74c3c', '#3498db'],
  fitBounds = true,
}: MapRouteDisplayProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  // Extract coordinates from a stop
  const getCoordinates = (stop: Stop): [number, number] => {
    if (!stop.map) return [0, 0];

    // Parse coordinates from the map property (format: "14.772366427918241, 53.459639038129296")
    const parts = stop.map.split(',').map((part) => parseFloat(part.trim()));
    return [parts[0], parts[1]];
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [14.77, 53.46], // Default center (Goleniów)
        zoom: 12,
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
  }, [mapContainer]);

  // Add routes to map when it's loaded
  useEffect(() => {
    if (!mapLoaded || !map.current || !routes.length) return;

    // Clear existing layers and sources
    const layerIds =
      map.current.getStyle().layers?.map((layer) => layer.id) || [];
    layerIds.forEach((id) => {
      if (id.startsWith('route-') || id.startsWith('stops-')) {
        map.current?.removeLayer(id);
      }
    });

    const sourceIds = Object.keys(map.current.getStyle().sources || {});
    sourceIds.forEach((id) => {
      if (id.startsWith('route-') || id.startsWith('stops-')) {
        map.current?.removeSource(id);
      }
    });

    // Process each route
    const bounds = new maplibregl.LngLatBounds();

    routes.forEach((route, routeIndex) => {
      if (!route.length) return;

      const routeColor = colors[routeIndex % colors.length];
      const routeCoordinates = route
        .filter((stop) => stop.map) // Only include stops with map coordinates
        .map((stop) => getCoordinates(stop));

      // Extend bounds with all coordinates
      routeCoordinates.forEach((coord) => {
        bounds.extend(coord as maplibregl.LngLatLike);
      });

      // Add route line
      map.current?.addSource(`route-${routeIndex}`, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates,
          },
        },
      });

      map.current?.addLayer({
        id: `route-${routeIndex}`,
        type: 'line',
        source: `route-${routeIndex}`,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': routeColor,
          'line-width': 4,
        },
      });

      // Add stops
      route.forEach((stop, stopIndex) => {
        if (!stop.map) return;

        const coordinates = getCoordinates(stop);

        // Create marker for each stop
        const marker = new maplibregl.Marker({
          color: routeColor,
        })
          .setLngLat(coordinates)
          .addTo(map.current!);

        // Create popup
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
        }).setHTML(`
          <div class="stop-popup">
            <strong>${stop.name}</strong>
            ${stop.is_on_request ? '<div class="on-request">Na żądanie</div>' : ''}
            <div class="stop-number">Przystanek #${stop.stop_number}</div>
          </div>
        `);

        // Add hover effect
        marker.getElement().addEventListener('mouseenter', () => {
          popup.setLngLat(coordinates).addTo(map.current!);
        });

        marker.getElement().addEventListener('mouseleave', () => {
          popup.remove();
        });
      });
    });

    // Fit the map to include all markers if requested
    if (fitBounds && !bounds.isEmpty()) {
      map.current.fitBounds(bounds, {
        padding: 70,
        maxZoom: 15,
      });
    }
  }, [mapLoaded, routes, colors, fitBounds]);

  return (
    <div className="map-container">
      <div ref={mapContainer} className="map" />
    </div>
  );
};

export default MapRouteDisplay;
