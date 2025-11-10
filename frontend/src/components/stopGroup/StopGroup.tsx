import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import service, { DepartureData, StopData } from '../../services/db';
import MiniRealTimeDepartures from '../miniRealTimeDepartures/MiniRealTimeDepartures';
import './StopGroup.css';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import SingleStopMap from '../singleStopMap/SingleStopMap';
import PageTitle from '../common/pageTitle/PageTitle';
import {
  useRealTimeDepartures,
  type DepartureInfo,
} from '../../utils/departureUtils';
import Loading from '../common/loadingScreen/Loading';
import { usePageMetadata } from '../../utils/usePageMetadata';

const StopGroup = () => {
  const { stopId } = useParams<{ stopId: string }>();
  const [stopGroup, setStopGroup] = useState<StopData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);

    service
      .getStopGroup(Number(stopId))
      .then((data) => {
        if (!data || data.length === 0) {
          setError('Nie znaleziono przystanków w tej grupie');
          return;
        }
        setStopGroup(data);

        setError(null);
      })
      .catch((err) => {
        console.error('Error fetching stop group:', err);
        setError('Wystąpił błąd podczas ładowania danych przystanku');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [stopId]);

  const groupName = stopGroup[0]?.stop?.group_name ?? '';
  const stopStreet = stopGroup[0]?.stop?.street ?? '';
  const servedLines = useMemo(() => {
    const lines = new Set<string>();
    stopGroup.forEach((item) => {
      (item.departures || []).forEach((departure) => {
        if (departure.line?.name) {
          lines.add(departure.line.name);
        }
      });
    });
    return Array.from(lines).slice(0, 6);
  }, [stopGroup]);

  usePageMetadata({
    title: groupName
      ? `Zespół przystankowy ${groupName} – rozkład jazdy`
      : 'Zespół przystankowy – rozkład jazdy',
    description: groupName
      ? `Aktualne odjazdy autobusów z zespołu przystankowego ${groupName}${
          stopStreet ? ` przy ${stopStreet}` : ''
        }. Obsługiwane linie: ${
          servedLines.length > 0
            ? servedLines.join(', ')
            : 'sprawdź listę najbliższych odjazdów.'
        }`
      : 'Sprawdź najbliższe odjazdy autobusów z wybranego zespołu przystankowego GKM.',
  });

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <>
      {!isLoading ? (
        <div className="StopGroup" aria-live="polite">
          <PageTitle title={`Zespół przystankowy "${groupName || ''}"`} />
          <h4>
            Ten zespół składa się z {stopGroup.length}{' '}
            {stopGroup.length > 1 ? 'przystanków' : 'przystanku'}
          </h4>
          <div className="stopContainer">
            {stopGroup.map((stop, index) => (
              <StopCard
                key={stop.stop.stop_id ?? `stop-${index}`}
                stop_={stop}
              />
            ))}
          </div>
        </div>
      ) : (
        <LoadingScreen />
      )}
    </>
  );
};

type CombinedDeparture = DepartureData & Partial<DepartureInfo>;

const buildDepartureKey = (departure: any = {}) => {
  const time = departure?.departure_time ?? '';
  const stopNumber = departure?.stop_number ?? '';
  const lineName = departure?.line?.name ?? departure?.line_name ?? '';
  const destination =
    departure?.last_stop ?? departure?.alias ?? departure?.name ?? '';
  return `${time}|${stopNumber}|${lineName}|${destination}`;
};

const StopCard = ({ stop_ }: { stop_: StopData }) => {
  const { stop, departures, loading } = useRealTimeDepartures(
    stop_.stop.stop_id
  );
  const fallbackStop = stop_.stop;
  const activeStop = stop || {};
  const stopName =
    activeStop.alias ||
    activeStop.name ||
    fallbackStop.alias ||
    fallbackStop.group_name ||
    fallbackStop.street ||
    '';
  const stopStreet = activeStop.street || fallbackStop.street || '';
  const stopMap = activeStop.map ?? fallbackStop.map ?? '';
  const stopId = activeStop.stop_id ?? fallbackStop.stop_id;
  const stopGroupId = activeStop.group_id ?? fallbackStop.group_id;
  const scheduleDepartures = stop_.departures ?? [];

  const scheduleMap = useMemo(() => {
    const map = new Map<string, DepartureData>();
    scheduleDepartures.forEach((dep) => {
      map.set(buildDepartureKey(dep), dep);
    });
    return map;
  }, [scheduleDepartures]);

  const displayDepartures = useMemo<CombinedDeparture[]>(() => {
    const source = departures.length > 0 ? departures : scheduleDepartures;
    return source.map((dep) => {
      const fallback = scheduleMap.get(buildDepartureKey(dep));
      return {
        ...(fallback ?? {}),
        ...(dep as Partial<DepartureInfo>),
      } as CombinedDeparture;
    });
  }, [departures, scheduleDepartures, scheduleMap]);

  if (loading) return <Loading />;

  return (
    <div key={stopId} className="stop">
      <SingleStopMap
        coordinates={stopMap}
        name={stopName}
        street={stopStreet}
        stopId={stopId}
        color="#e74c3c"
      />
      <h3>Przystanek nr {stopGroupId + '/' + stopId}</h3>
      {activeStop.alias || fallbackStop.alias ? (
        <h4 style={{ margin: '0' }}>
          Nazwa poboczna: {activeStop.alias || fallbackStop.alias}
        </h4>
      ) : (
        ''
      )}
      <h4>ulica/lokalizacja: {stopStreet}</h4>
      <MiniRealTimeDepartures id={stopId} />
      <h3>Najbliższe odjazdy według rozkładu jazdy:</h3>

      {displayDepartures.length > 0 ? (
        displayDepartures
          .slice(0, 20)
          .map((departure, idx) => (
            <Departure
              key={`${buildDepartureKey(departure)}|${idx}`}
              departure={departure}
            />
          ))
      ) : (
        <div>Brak najbliższych odjazdów z tego przystanku</div>
      )}
    </div>
  );
};

const Departure = ({ departure }: { departure: CombinedDeparture }) => {
  const lineName = departure.line?.name ?? departure.line_name ?? '';
  const lineColor = departure.line?.color ?? '#056b89';
  const destination =
    departure.alias ??
    departure.line?.custom_headsign ??
    departure.last_stop ??
    '';
  const routeId = departure.route_id ?? '';
  const stopNumber = departure.stop_number ?? '';
  const timetableLink =
    routeId !== '' && stopNumber !== ''
      ? `/rozklad-jazdy-wedlug-linii/${routeId}/${stopNumber}`
      : '#';

  return (
    <div className="route">
      <div className="line-name">
        <div
          className="type-color"
          style={{ backgroundColor: lineColor }}
        ></div>
        {lineName}
      </div>
      <div>
        <Link to={timetableLink} className="destination-link">
          {destination}
        </Link>
      </div>
      <div>{departure.departure_time}</div>
    </div>
  );
};

export default StopGroup;
