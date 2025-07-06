import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapRouteDisplay.css';

interface Stop {
  map: string;
  street: string;
  is_on_request: boolean;
  name: string;
  stop_number: string;
}

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

  const getCoordinates = (stop: Stop): [number, number] => {
    if (!stop.map) return [0, 0];

    const parts = stop.map.split(',').map((part) => parseFloat(part.trim()));
    return [parts[0], parts[1]];
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [14.77, 53.46],
        zoom: 12,
      });

      map.current.on('load', () => {
        setMapLoaded(true);
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapContainer]);

  useEffect(() => {
    if (!mapLoaded || !map.current || !routes.length) return;

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

    const bounds = new maplibregl.LngLatBounds();

    routes.forEach((route, routeIndex) => {
      if (!route.length) return;

      const routeColor = colors[routeIndex % colors.length];
      const routeCoordinates = route
        .filter((stop) => stop.map)
        .map((stop) => getCoordinates(stop));

      routeCoordinates.forEach((coord) => {
        bounds.extend(coord as maplibregl.LngLatLike);
      });

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

      route.forEach((stop, stopIndex) => {
        if (!stop.map) return;

        const coordinates = getCoordinates(stop);

        const marker = new maplibregl.Marker({
          color: routeColor,
        })
          .setLngLat(coordinates)
          .addTo(map.current!);

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

        marker.getElement().addEventListener('mouseenter', () => {
          popup.setLngLat(coordinates).addTo(map.current!);
        });

        marker.getElement().addEventListener('mouseleave', () => {
          popup.remove();
        });
      });
    });

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
