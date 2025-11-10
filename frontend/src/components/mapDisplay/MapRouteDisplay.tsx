import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapRouteDisplay.css';
import busIcon from '../../assets/bus.svg';
import tramIcon from '../../assets/tram.svg';
import trainIcon from '../../assets/train.svg';
import stopIcon from '../../assets/stop.svg';
import fullScreenIcon from '../../assets/fullscreen.svg';
import {
  getMarkerScale,
  useBusMarkers,
  parseBusKey,
  type ActiveBus,
  type BusMarkerEntry,
} from '../../utils/mapUtils';
import MapControls from './MapControls';
import { useRoutesLayer } from './hooks/useRoutesLayer';
import { useStopsLayer } from './hooks/useStopsLayer';
import { type RouteCoordinate, type Stop } from './types';

interface MapRouteDisplayProps {
  routes?: RouteCoordinate[][];
  activeBuses?: ActiveBus[];
  fitBounds?: boolean;
  stops?: Stop[];
}

const ROUTE_ARROW_IMAGE_ID = 'route-arrow-icon';

const MapRouteDisplay = ({
  routes,
  activeBuses,
  fitBounds = true,
  stops,
}: MapRouteDisplayProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showStops, setShowStops] = useState<boolean>(false);
  const busMarkersRef = useRef<Map<string, BusMarkerEntry>>(new Map());
  const stopMarkersRef = useRef<maplibregl.Marker[]>([]);

  const [selectedBusKey, setSelectedBusKey] = useState<string | null>(null);
  const [popupOpenBusId, setPopupOpenBusId] = useState<string | null>(null);
  const stopBoundsFittedRef = useRef<boolean>(false);

  const selectedBusKeyParts = useMemo(() => {
    if (!selectedBusKey) return null;
    return parseBusKey(selectedBusKey);
  }, [selectedBusKey]);

  const selectedRouteId = selectedBusKeyParts?.routeId ?? null;
  const vehicleIcons = useMemo(
    () => ({
      bus: busIcon,
      tram: tramIcon,
      train: trainIcon,
    }),
    []
  );

  useEffect(() => {
    const handleFullscreenChange = () => {
      const container = mapContainer.current?.parentElement;
      const isActive =
        !!document.fullscreenElement &&
        document.fullscreenElement === container;
      setIsFullscreen(isActive);
      map.current?.resize();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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

      map.current.on('click', (event) => {
        const features = map.current?.queryRenderedFeatures(event.point);
        const clickedOnMarker = features?.some(
          (feature) =>
            feature.layer.id === 'polyline-' || feature.layer.id === 'arrows-'
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
    };
  }, [mapContainer]);

  const toggleFullscreen = () => {
    const container = mapContainer.current?.parentElement as HTMLElement | null;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        void container.requestFullscreen();
      }
      return;
    }

    if (document.fullscreenElement === container) {
      void document.exitFullscreen();
      return;
    }

    void document.exitFullscreen();
    if (container.requestFullscreen) {
      void container.requestFullscreen();
    }
  };

  const toggleShowStops = () => {
    setShowStops((previous) => !previous);
  };

  useEffect(() => {
    stopBoundsFittedRef.current = false;
  }, [stops]);

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

  useRoutesLayer({
    mapLoaded,
    mapRef: map,
    routes,
    selectedRouteId,
    routeArrowImageId: ROUTE_ARROW_IMAGE_ID,
  });

  useStopsLayer({
    mapLoaded,
    mapRef: map,
    stops,
    showStops,
    selectedBusKey,
    fitBounds,
    stopBoundsFittedRef,
    stopMarkersRef,
    stopIcon,
  });

  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    const updateMarkerViewProps = () => {
      if (!map.current) return;
      const zoom = map.current.getZoom();
      const scale = getMarkerScale(zoom);
      const mapBearing = map.current.getBearing();

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
      <MapControls
        showStops={showStops}
        onToggleStops={toggleShowStops}
        onToggleFullscreen={toggleFullscreen}
        fullscreenIcon={fullScreenIcon}
        stopIcon={stopIcon}
      />
      <div ref={mapContainer} className="map" />
    </div>
  );
};

export default MapRouteDisplay;
