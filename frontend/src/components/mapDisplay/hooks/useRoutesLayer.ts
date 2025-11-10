import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { ensureRouteArrowImage } from '../../../utils/mapUtils';
import { type RouteCoordinate } from '../types';

interface UseRoutesLayerOptions {
  mapLoaded: boolean;
  mapRef: React.RefObject<maplibregl.Map | null>;
  routes?: RouteCoordinate[][];
  selectedRouteId: string | null;
  routeArrowImageId: string;
}

export const useRoutesLayer = ({
  mapLoaded,
  mapRef,
  routes,
  selectedRouteId,
  routeArrowImageId,
}: UseRoutesLayerOptions) => {
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const mapInstance = mapRef.current;
    const style = mapInstance.getStyle();
    if (!style || !style.layers || !style.sources) return;

    const routesToDraw = routes ?? [];

    const layerIds = style.layers.map((layer) => layer.id) || [];
    layerIds.forEach((id) => {
      if (id.startsWith('polyline-') || id.startsWith('arrows-')) {
        if (mapInstance.getLayer(id)) mapInstance.removeLayer(id);
      }
    });

    const sourceIds = Object.keys(style.sources || {});
    sourceIds.forEach((id) => {
      if (id.startsWith('polyline-') || id.startsWith('arrow-points-')) {
        if (mapInstance.getSource(id)) mapInstance.removeSource(id);
      }
    });

    const shouldDrawRoutes = selectedRouteId !== null;

    if (routesToDraw.length > 0 && shouldDrawRoutes) {
      routesToDraw.forEach((routeCoords, routeIndex) => {
        if (!routeCoords || routeCoords.length === 0) return;

        if (
          selectedRouteId &&
          routeCoords[0]?.departure_route_id.toString() !== selectedRouteId
        ) {
          return;
        }

        const routeColor = '#842128';
        const validCoordinates = routeCoords.filter(
          (coord) =>
            coord.lat !== null &&
            coord.lon !== null &&
            !Number.isNaN(coord.lat) &&
            !Number.isNaN(coord.lon)
        );

        if (validCoordinates.length < 2) return;

        const lineCoordinates = validCoordinates.map((coord) => [
          coord.lon,
          coord.lat,
        ]);

        mapInstance.addSource(`polyline-${routeIndex}`, {
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

        mapInstance.addLayer({
          id: `polyline-${routeIndex}`,
          type: 'line',
          source: `polyline-${routeIndex}`,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': routeColor, 'line-width': 3 },
        });

        try {
          const arrowPoints: any[] = [];
          const totalDistance = lineCoordinates.reduce((acc, coord, index) => {
            if (index === 0) return acc;
            const prev = lineCoordinates[index - 1];
            const segmentDistance = Math.hypot(
              coord[0] - prev[0],
              coord[1] - prev[1]
            );
            return acc + segmentDistance;
          }, 0);

          const metersPerLonAtEquator = 111320;
          const approxMeters = totalDistance * metersPerLonAtEquator;
          const desiredSpacingMeters = 500;
          const targetArrowCount = Math.min(
            6,
            Math.max(3, Math.round(approxMeters / desiredSpacingMeters))
          );
          const spacing = totalDistance / targetArrowCount;

          if (Number.isFinite(spacing) && spacing > 0) {
            let accumulatedDistance = 0;
            let nextArrowDistance = spacing;

            for (let i = 1; i < lineCoordinates.length; i++) {
              const previous = lineCoordinates[i - 1];
              const current = lineCoordinates[i];
              const segmentDistance = Math.hypot(
                current[0] - previous[0],
                current[1] - previous[1]
              );

              if (segmentDistance === 0) continue;

              while (
                accumulatedDistance + segmentDistance >=
                nextArrowDistance
              ) {
                const ratio =
                  (nextArrowDistance - accumulatedDistance) / segmentDistance;
                const arrowLon =
                  previous[0] + ratio * (current[0] - previous[0]);
                const arrowLat =
                  previous[1] + ratio * (current[1] - previous[1]);
                const bearing =
                  (Math.atan2(
                    current[0] - previous[0],
                    current[1] - previous[1]
                  ) *
                    180) /
                  Math.PI;

                arrowPoints.push({
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [arrowLon, arrowLat],
                  },
                  properties: { bearing },
                });
                nextArrowDistance += spacing;
              }

              accumulatedDistance += segmentDistance;
            }
          }

          if (arrowPoints.length > 0) {
            mapInstance.addSource(`arrow-points-${routeIndex}`, {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: arrowPoints,
              },
            });

            ensureRouteArrowImage(mapInstance, routeArrowImageId);

            mapInstance.addLayer({
              id: `arrows-${routeIndex}`,
              type: 'symbol',
              source: `arrow-points-${routeIndex}`,
              layout: {
                'icon-image': routeArrowImageId,
                'icon-size': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10,
                  0.6,
                  14,
                  0.85,
                  16,
                  1.05,
                ],
                'icon-rotate': ['get', 'bearing'],
                'icon-rotation-alignment': 'map',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
              },
              paint: { 'icon-opacity': 0.9 },
            });
          }
        } catch (error) {
          console.warn('Unable to render route direction arrows', error);
        }
      });
    }
  }, [mapLoaded, mapRef, routes, selectedRouteId, routeArrowImageId]);
};
