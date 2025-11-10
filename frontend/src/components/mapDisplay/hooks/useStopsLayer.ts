import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { type Stop } from '../types';

interface StopGroup {
  name: string;
  meanLat: number;
  meanLon: number;
  stops: Stop[];
}

interface UseStopsLayerOptions {
  mapLoaded: boolean;
  mapRef: React.RefObject<maplibregl.Map | null>;
  stops?: Stop[];
  showStops: boolean;
  selectedBusKey: string | null;
  fitBounds: boolean;
  stopBoundsFittedRef: React.MutableRefObject<boolean>;
  stopMarkersRef: React.MutableRefObject<maplibregl.Marker[]>;
  stopIcon: string;
}

export const useStopsLayer = ({
  mapLoaded,
  mapRef,
  stops,
  showStops,
  selectedBusKey,
  fitBounds,
  stopBoundsFittedRef,
  stopMarkersRef,
  stopIcon,
}: UseStopsLayerOptions) => {
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const mapInstance = mapRef.current;
    const stopList = (stops ?? []).filter(
      (stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lon)
    );

    const stopGroupsMap = stopList.reduce(
      (acc, stop) => {
        const key = stop.name ?? '';
        if (!acc[key]) {
          acc[key] = {
            name: key,
            latSum: 0,
            lonSum: 0,
            count: 0,
            stops: [] as Stop[],
          };
        }

        acc[key].latSum += stop.lat;
        acc[key].lonSum += stop.lon;
        acc[key].count += 1;
        acc[key].stops.push(stop);
        return acc;
      },
      {} as Record<
        string,
        {
          name: string;
          latSum: number;
          lonSum: number;
          count: number;
          stops: Stop[];
        }
      >
    );

    const stopGroups = new Map<string, StopGroup>();
    Object.values(stopGroupsMap).forEach((group) => {
      if (group.count === 0) return;
      const name = group.name;
      stopGroups.set(name, {
        name,
        meanLat: group.latSum / group.count,
        meanLon: group.lonSum / group.count,
        stops: group.stops,
      });
    });

    const globalBounds = new maplibregl.LngLatBounds();
    stopList.forEach((stop) => {
      globalBounds.extend([stop.lon, stop.lat]);
    });

    if (
      !selectedBusKey &&
      fitBounds &&
      stopList.length > 0 &&
      !globalBounds.isEmpty() &&
      !stopBoundsFittedRef.current
    ) {
      mapInstance.fitBounds(globalBounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 14,
        duration: 1000,
      });
      stopBoundsFittedRef.current = true;
    }

    const clearStopMarkers = () => {
      stopMarkersRef.current.forEach((marker) => {
        const el = marker.getElement();
        const content = el.querySelector(
          '.stop-cluster-marker-content'
        ) as HTMLElement | null;

        if (content) {
          content.classList.remove('is-visible');
          content.classList.add('is-hiding');
          setTimeout(() => {
            marker.remove();
          }, 180);
        } else {
          marker.remove();
        }
      });
      stopMarkersRef.current = [];
    };

    [
      'clusters',
      'cluster-count',
      'unclustered-point',
      'unclustered-point-label',
    ].forEach((layerId) => {
      if (mapInstance.getLayer(layerId)) {
        mapInstance.removeLayer(layerId);
      }
    });

    if (mapInstance.getSource('stops')) {
      mapInstance.removeSource('stops');
    }

    clearStopMarkers();

    if (!showStops || stopList.length === 0) {
      return;
    }

    const clusterStops = (
      stopsInView: Stop[],
      zoom: number
    ): {
      lat: number;
      lon: number;
      count: number;
      stops: Stop[];
    }[] => {
      if (stopsInView.length === 0) {
        return [];
      }

      const clusters: {
        count: number;
        latSum: number;
        lonSum: number;
        xSum: number;
        ySum: number;
        stops: Stop[];
      }[] = [];

      const clusterRadiusPx = zoom >= 15 ? 1 : zoom >= 13 ? 140 : 100;

      stopsInView.forEach((stop) => {
        const projected = mapInstance.project([stop.lon, stop.lat]);
        let matchedCluster: (typeof clusters)[number] | undefined;

        for (const cluster of clusters) {
          const avgX = cluster.xSum / cluster.count;
          const avgY = cluster.ySum / cluster.count;
          const dx = avgX - projected.x;
          const dy = avgY - projected.y;
          if (dx * dx + dy * dy <= clusterRadiusPx * clusterRadiusPx) {
            matchedCluster = cluster;
            break;
          }
        }

        if (!matchedCluster) {
          clusters.push({
            count: 1,
            latSum: stop.lat,
            lonSum: stop.lon,
            xSum: projected.x,
            ySum: projected.y,
            stops: [stop],
          });
          return;
        }

        matchedCluster.count += 1;
        matchedCluster.latSum += stop.lat;
        matchedCluster.lonSum += stop.lon;
        matchedCluster.xSum += projected.x;
        matchedCluster.ySum += projected.y;
        matchedCluster.stops.push(stop);
      });

      return clusters.map((cluster) => ({
        count: cluster.count,
        lat: cluster.latSum / cluster.count,
        lon: cluster.lonSum / cluster.count,
        stops: cluster.stops,
      }));
    };

    const createStopMarker = (stop: Stop) => {
      const el = document.createElement('div');
      el.className = 'stop-marker';

      const img = document.createElement('img');
      img.src = stopIcon;
      img.alt = stop.name ?? 'Stop';
      img.className = 'stop-marker-image';
      img.draggable = false;
      el.appendChild(img);

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([stop.lon, stop.lat])
        .addTo(mapInstance);

      stopMarkersRef.current.push(marker);
    };

    const createStopLabelMarker = (group: StopGroup) => {
      if (!group.name) return;

      const labelEl = document.createElement('div');
      labelEl.className = 'stop-name';
      labelEl.textContent = group.name;
      labelEl.setAttribute('role', 'status');
      labelEl.setAttribute('aria-label', group.name);

      const marker = new maplibregl.Marker({
        element: labelEl,
        anchor: 'bottom',
      })
        .setLngLat([group.meanLon, group.meanLat])
        .addTo(mapInstance);

      stopMarkersRef.current.push(marker);
    };

    const createClusterMarker = (cluster: {
      lat: number;
      lon: number;
      count: number;
      stops: Stop[];
    }) => {
      const el = document.createElement('div');
      el.className = 'stop-cluster-marker';

      const inner = document.createElement('div');
      inner.className = 'stop-cluster-marker-content';
      const uniqueNameCount = new Set(cluster.stops.map((stop) => stop.name))
        .size;
      inner.textContent =
        uniqueNameCount > 99 ? '99+' : uniqueNameCount.toString();

      el.appendChild(inner);

      el.addEventListener('click', (event) => {
        event.stopPropagation();
        const currentZoom = mapInstance.getZoom();
        const targetZoom = Math.min(currentZoom + 1.8, 17.5);
        mapInstance.easeTo({
          center: [cluster.lon, cluster.lat],
          zoom: cluster.count <= 4 ? Math.max(targetZoom, 15.5) : targetZoom,
          duration: 420,
        });
      });

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([cluster.lon, cluster.lat])
        .addTo(mapInstance);

      requestAnimationFrame(() => {
        inner.classList.add('is-visible');
      });

      stopMarkersRef.current.push(marker);
    };

    const updateStopMarkers = () => {
      const zoom = mapInstance.getZoom();
      const stopVisibilityZoom = 13;
      const shouldShowIndividualStops = zoom >= stopVisibilityZoom - 0.05;

      clearStopMarkers();

      const bounds = mapInstance.getBounds();
      const stopsInBounds = stopList.filter((stop) =>
        bounds.contains([stop.lon, stop.lat])
      );

      if (stopsInBounds.length === 0) {
        return;
      }

      if (shouldShowIndividualStops) {
        const visibleGroupNames = new Set<string>();
        stopsInBounds.forEach((stop) => {
          visibleGroupNames.add(stop.name ?? '');
          createStopMarker(stop);
        });

        visibleGroupNames.forEach((name) => {
          const group = stopGroups.get(name);
          if (group) {
            createStopLabelMarker(group);
          }
        });
        return;
      }

      const clusters = clusterStops(stopList, zoom);

      clusters.forEach((cluster) => {
        if (cluster.count === 1) {
          createStopMarker(cluster.stops[0]);
        } else {
          createClusterMarker(cluster);
        }
      });
    };

    const handleMoveEnd = () => {
      updateStopMarkers();
    };
    const handleZoomEnd = () => updateStopMarkers();

    updateStopMarkers();

    mapInstance.on('moveend', handleMoveEnd);
    mapInstance.on('zoomend', handleZoomEnd);

    return () => {
      mapInstance.off('moveend', handleMoveEnd);
      mapInstance.off('zoomend', handleZoomEnd);
      clearStopMarkers();
    };
  }, [
    mapLoaded,
    mapRef,
    stops,
    showStops,
    selectedBusKey,
    fitBounds,
    stopBoundsFittedRef,
    stopMarkersRef,
    stopIcon,
  ]);
};
