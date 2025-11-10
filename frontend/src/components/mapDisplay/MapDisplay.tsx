import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapRouteDisplay.css';
import busIcon from '../../assets/bus.svg';
import tramIcon from '../../assets/tram.svg';
import trainIcon from '../../assets/train.svg';
import stopIcon from '../../assets/stop.svg';
import {
  getMarkerScale,
  useBusMarkers,
  parseBusKey,
  type ActiveBus,
  type BusMarkerEntry,
} from '../../utils/mapUtils';

interface RouteCoordinate {
  departure_route_id: number;
  id: number;
  lat: number;
  lon: number;
  stop_nearby: boolean;
  stop_number: number;
}

interface Stop {
  id: number;
  name: string;
  street: string;
  lat: number;
  lon: number;
  stop_number: number;
}

interface MapRouteDisplayProps {
  routes?: RouteCoordinate[][];
  activeBuses?: ActiveBus[];
  fitBounds?: boolean;
  stops?: Stop[];
}

const MapOneLineDisplay = ({
  routes,
  activeBuses,
  fitBounds = true,
  stops,
}: MapRouteDisplayProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const busMarkersRef = useRef<Map<string, BusMarkerEntry>>(new Map());

  const routesInitialized = useRef<boolean>(false);
  const initialBoundsFitted = useRef<boolean>(false);
  const [selectedBusKey, setSelectedBusKey] = useState<string | null>(null);
  const [popupOpenBusId, setPopupOpenBusId] = useState<string | null>(null);

  const selectedRouteId = useMemo(() => {
    if (!selectedBusKey) return null;
    return parseBusKey(selectedBusKey).routeId;
  }, [selectedBusKey]);

  const vehicleIcons = useMemo(
    () => ({
      bus: busIcon,
      tram: tramIcon,
      train: trainIcon,
    }),
    []
  );

  useEffect(() => {
    if (!mapContainer.current) return;

    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style:
          'https://api.jawg.io/styles/jawg-streets.json?access-token=2JuoTyW8QomKB24hXnmmq0giE7T03W4VkDYT33u4AvKTnNSNGC6UOkTCA7COJafq',
        center: [14.828291270757882, 53.56385849757642],
        zoom: 10,
      });

      map.current.on('load', () => {
        setMapLoaded(true);
      });

      map.current.on('click', (e) => {
        const features = map.current?.queryRenderedFeatures(e.point);
        const clickedOnMarker = features?.some(
          (f) => f.layer.id === 'polyline-' || f.layer.id === 'arrows-'
        );

        if (!clickedOnMarker) {
          setSelectedBusKey(null);
          setPopupOpenBusId(null);
        }
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      routesInitialized.current = false;
    };
  }, [mapContainer]);

  useEffect(() => {
    routesInitialized.current = false;
  }, [routes, selectedRouteId, stops]);

  useBusMarkers({
    mapLoaded,
    mapRef: map,
    activeBuses,
    busMarkersRef,
    selectedBusKey,
    setSelectedBusKey,
    popupOpenBusId,
    setPopupOpenBusId,
    vehicleIcons,
  });

  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    if (routesInitialized.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    const individualStopMarkers: maplibregl.Marker[] = [];
    const clusterMarkers: maplibregl.Marker[] = [];

    const style = map.current.getStyle?.();

    if (!style || !style.layers || !style.sources) {
      return;
    }

    const layerIds = style.layers.map((layer) => layer.id) || [];
    layerIds.forEach((id) => {
      if (
        id.startsWith('route-') ||
        id.startsWith('polyline-') ||
        id.startsWith('arrows-') ||
        id === 'clusters' ||
        id === 'cluster-count' ||
        id === 'unclustered-point'
      ) {
        map.current?.removeLayer(id);
      }
    });

    const sourceIds = Object.keys(style.sources || {});
    sourceIds.forEach((id) => {
      if (
        id.startsWith('route-') ||
        id.startsWith('polyline-') ||
        id.startsWith('arrow-points-')
      ) {
        map.current?.removeSource(id);
      }
    });

    const bounds = new maplibregl.LngLatBounds();

    if (routes && routes.length > 0) {
      routes.forEach((routeCoords, routeIndex) => {
        if (!routeCoords || routeCoords.length === 0) return;

        const routeColor = '#1f3d8a';

        const validCoordinates = routeCoords.filter(
          (coord) =>
            coord.lat !== null &&
            coord.lon !== null &&
            !Number.isNaN(coord.lat) &&
            !Number.isNaN(coord.lon)
        );

        if (validCoordinates.length < 2) {
          return;
        }

        let lineCoordinates = validCoordinates.map((coord) => [
          coord.lon,
          coord.lat,
        ]);

        lineCoordinates.forEach((coord) => {
          bounds.extend(coord as maplibregl.LngLatLike);
        });

        map.current?.addSource(`polyline-${routeIndex}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: lineCoordinates,
            },
          },
        });

        map.current?.addLayer({
          id: `polyline-${routeIndex}`,
          type: 'line',
          source: `polyline-${routeIndex}`,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': routeColor,
            'line-width': 3,
          },
        });
      });
    }

    routesInitialized.current = true;

    if (stops && stops.length > 0) {
      const stopsByName: Record<string, Stop[]> = {};
      stops.forEach((stop) => {
        if (
          typeof stop.lat === 'number' &&
          typeof stop.lon === 'number' &&
          !Number.isNaN(stop.lat) &&
          !Number.isNaN(stop.lon)
        ) {
          if (!stopsByName[stop.name]) stopsByName[stop.name] = [];
          stopsByName[stop.name].push(stop);
        }
      });

      stops.forEach((stop) => {
        const stopEl = document.createElement('div');
        stopEl.className = 'stop-marker petite-stop-marker';

        const img = document.createElement('img');
        img.src = stopIcon;
        img.alt = stop.name ?? 'Stop';
        img.className = 'stop-marker-image';
        img.draggable = false;
        stopEl.appendChild(img);
        const stopMarker = new maplibregl.Marker({
          element: stopEl,
          anchor: 'bottom',
        }).setLngLat([stop.lon, stop.lat]);
        individualStopMarkers.push(stopMarker);
        bounds.extend([stop.lon, stop.lat]);
      });

      Object.entries(stopsByName).forEach(([name, stopsArr]) => {
        if (stopsArr.length === 0) return;
        const meanLat =
          stopsArr.reduce((sum, s) => sum + s.lat, 0) / stopsArr.length;
        const meanLon =
          stopsArr.reduce((sum, s) => sum + s.lon, 0) / stopsArr.length;
        const clusterEl = document.createElement('div');
        clusterEl.className = 'stop-marker petite-stop-marker';
        const labelDiv = document.createElement('div');
        labelDiv.className = 'stop-name';
        labelDiv.textContent = name;
        labelDiv.setAttribute('role', 'status');
        labelDiv.setAttribute('aria-label', name);
        labelDiv.style.display = 'none';

        const img = document.createElement('img');
        img.src = stopIcon;
        img.alt = stop.name ?? 'Stop';
        img.className = 'stop-marker-image';
        img.draggable = false;
        clusterEl.appendChild(img);
        clusterEl.appendChild(labelDiv);
        const clusterMarker = new maplibregl.Marker({
          element: clusterEl,
          anchor: 'bottom',
        }).setLngLat([meanLon, meanLat]);
        clusterMarkers.push(clusterMarker);
      });

      const labelMarkers: maplibregl.Marker[] = [];
      Object.entries(stopsByName).forEach(([name, stopsArr]) => {
        if (stopsArr.length === 0) return;
        const meanLat =
          stopsArr.reduce((sum, s) => sum + s.lat, 0) / stopsArr.length;
        const meanLon =
          stopsArr.reduce((sum, s) => sum + s.lon, 0) / stopsArr.length;
        const labelDiv = document.createElement('div');
        labelDiv.className = 'stop-name';
        labelDiv.textContent = name;
        labelDiv.setAttribute('role', 'status');
        labelDiv.setAttribute('aria-label', name);
        const labelMarker = new maplibregl.Marker({
          element: labelDiv,
          anchor: 'bottom',
        }).setLngLat([meanLon, meanLat]);
        labelMarkers.push(labelMarker);
      });

      const setMarkersOnMap = (markers: maplibregl.Marker[], show: boolean) => {
        markers.forEach((marker) => {
          if (show) {
            marker.addTo(map.current!);
          } else {
            marker.remove();
          }
        });
      };

      const updateStopMarkers = () => {
        const zoom = map.current!.getZoom();
        if (zoom >= 13) {
          setMarkersOnMap(individualStopMarkers, true);
          setMarkersOnMap(clusterMarkers, false);
          setMarkersOnMap(labelMarkers, true);
        } else {
          setMarkersOnMap(individualStopMarkers, false);
          setMarkersOnMap(clusterMarkers, true);
          setMarkersOnMap(labelMarkers, false);
        }
      };
      map.current!.on('zoom', updateStopMarkers);
      updateStopMarkers();

      markersRef.current.push(
        ...individualStopMarkers,
        ...clusterMarkers,
        ...labelMarkers
      );
    }

    if (!bounds.isEmpty() && fitBounds && !initialBoundsFitted.current) {
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 14,
        duration: 1000,
      });
      initialBoundsFitted.current = true;
    }
  }, [mapLoaded, routes, fitBounds, selectedRouteId, stops]);

  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    const updateMarkerViewProps = () => {
      const mapInstance = map.current;
      if (!mapInstance) return;
      const zoom = mapInstance.getZoom();
      const scale = getMarkerScale(zoom);
      const mapBearing = mapInstance.getBearing();

      busMarkersRef.current.forEach(({ marker }) => {
        const element = marker.getElement();
        element.style.setProperty('--marker-scale', `${scale}`);
        element.style.setProperty('--map-bearing', `${mapBearing}deg`);
      });
    };

    map.current.on('zoom', updateMarkerViewProps);
    map.current.on('rotate', updateMarkerViewProps);
    updateMarkerViewProps();

    return () => {
      map.current?.off('zoom', updateMarkerViewProps);
      map.current?.off('rotate', updateMarkerViewProps);
    };
  }, [mapLoaded]);

  return (
    <div className="map-container">
      <div ref={mapContainer} className="map" />
    </div>
  );
};

export default MapOneLineDisplay;
