import React, { useEffect, useMemo, useRef, useState } from 'react';
import './LineTimetable.css';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import service, { Stop } from '../../services/db';
import displayIcon from '../../assets/tablica.png';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import PageTitle from '../common/pageTitle/PageTitle';
import OptionalStop from '../common/symbols/OptionalStop';
import OnRequest from '../common/symbols/OnRequest';
import MapOneLineDisplay from '../mapDisplay/MapDisplay';
import busIcon from '../../assets/bus.svg';
import refreshIcon from '../../assets/refresh.svg';
import { usePageMetadata } from '../../utils/usePageMetadata';
const LineTimetable = () => {
  const { lineId } = useParams<{ lineId: string }>();
  interface LineTimetableData {
    line: {
      name: string;
      name_singular: string;
      color: string;
    };
    linePath: {
      first_stop: string;
      last_stop: string;
      streets: string[];
    }[];
    stops: Stop[];
  }

  const [line, setLine] = useState<LineTimetableData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const lastRefreshRef = useRef<number>(0); // Use ref instead of state to avoid rerenders
  const [activeBuses, setActiveBuses] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!lineId) return;

    const resolvedLineId = lineId;
    const fetchData = async () => {
      setSeconds(0);
      try {
        const result = await service.getAllActiveBusesForALine(resolvedLineId);
        setActiveBuses(result);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [lineId]);

  useEffect(() => {
    if (!lineId) return;

    const resolvedLineId = lineId;
    service
      .getLineRoutes(resolvedLineId)
      .then((data) => {
        setLine(data as unknown as LineTimetableData[]);
        service
          .getAllRoutesForALine(resolvedLineId)
          .then((routeData: Array<{ map_routes: any; stops: any[] }>) => {
            const standardizedStops = routeData.map((routeItem) =>
              (routeItem.stops || []).map((stop: any) => {
                let lat = null,
                  lon = null;
                if (
                  typeof stop.map === 'string' &&
                  stop.map.trim().length > 0
                ) {
                  let parts = stop.map.trim().split(/[ ,]+/);
                  if (parts.length === 2) {
                    let n1 = parseFloat(parts[1]);
                    let n2 = parseFloat(parts[0]);
                    if (Math.abs(n1) > 90 && Math.abs(n2) <= 90) {
                      lon = n1;
                      lat = n2;
                    } else {
                      lat = n1;
                      lon = n2;
                    }
                  }
                }
                return { ...stop, lat, lon };
              })
            );
            setStops(standardizedStops.flat());
            setRoutes(routeData.map((routeItem) => routeItem.map_routes));
          });
      })
      .finally(() => setLoading(false));
  }, [lineId]);

  useEffect(() => {
    const addSecond = () => {
      setSeconds((prevSeconds) => prevSeconds + 1);
    };

    const interval = setInterval(addSecond, 1000);
    return () => clearInterval(interval);
  }, []);
  const lineName = line[0]?.line.name ?? '';
  const lineTypeSingle = line[0]?.line.name_singular ?? '';
  const lineColor = line[0]?.line.color ?? '';
  const directions = useMemo(() => {
    const directionSet = new Set<string>();
    line.forEach((entry) => {
      (entry.linePath || []).forEach((path) => {
        const firstStop = (path.first_stop || '').trim();
        const lastStop = (path.last_stop || '').trim();
        const label =
          firstStop && lastStop
            ? `${firstStop} ↔ ${lastStop}`
            : firstStop || lastStop;
        if (label) {
          directionSet.add(label);
        }
      });
    });
    return Array.from(directionSet).slice(0, 4);
  }, [line]);

  const primaryDirection = directions[0] ?? '';

  usePageMetadata({
    title: lineName
      ? `Linia ${lineName}${primaryDirection ? `: ${primaryDirection}` : ''}`
      : 'Rozkład jazdy linii autobusowej',
    description: lineName
      ? `Sprawdź aktualny rozkład jazdy linii ${lineName}${
          lineTypeSingle ? ` (${lineTypeSingle})` : ''
        }. Trasy: ${
          directions.length > 0
            ? directions.join('; ')
            : 'pełna lista przystanków i kursów.'
        }`
      : 'Aktualny rozkład jazdy autobusów Goleniowskiej Komunikacji Miejskiej.',
  });

  useEffect(() => {
    const counterId = setInterval(() => {
      lastRefreshRef.current = lastRefreshRef.current + 1;
    }, 1000);

    return () => clearInterval(counterId);
  }, []);

  if (loading) return <LoadingScreen />;
  if (error) return <div className="error-message">{error}</div>;
  if (!line[0]) return <div className="not-found">Nie znaleziono linii</div>;

  return (
    <div className="LineTimetable responsive-container">
      <PageTitle
        type={lineTypeSingle}
        color={lineColor}
        title={`Rozkład jazdy linii ${lineName}`}
      />

      <h2>Przebieg linii</h2>
      {line[0].linePath.map((path, pathIndex) => (
        <LinePathInfo key={pathIndex} path={path} />
      ))}

      <h2>Przystanki linii</h2>
      {line.map((path) => (
        <Route stops={path.stops} lineId={lineId ? lineId : ''} />
      ))}

      <h2>Mapa</h2>

      <div className="container">
        <MapOneLineDisplay
          routes={routes}
          activeBuses={activeBuses}
          stops={stops}
        />

        <div className="info">
          <div>
            <div>
              <img
                className="bus-icon"
                src={busIcon}
                alt="icon"
                style={{
                  width: '24px',
                  height: '24px',
                  verticalAlign: 'middle',
                }}
              />
            </div>
            {activeBuses.length}
          </div>
          <div>
            <div>
              <img
                className="bus-icon"
                src={refreshIcon}
                alt="icon"
                style={{
                  width: '24px',
                  height: '24px',
                  verticalAlign: 'middle',
                }}
              />
            </div>{' '}
            {seconds}s temu
          </div>
        </div>
      </div>
    </div>
  );
};

interface LinePath {
  first_stop: string;
  last_stop: string;
  streets: string[];
}

const LinePathInfo: React.FC<{ path: LinePath }> = ({ path }) => (
  <div className="line-path">
    <div className="finalStops">
      {path.first_stop}
      {'  '}↔{'  '}
      {path.last_stop}
      {'  '}
      {path.first_stop == path.last_stop ? '🔁 (Trasa okrężna)' : ''}
    </div>
    <div className="streets">
      {path.streets.map((street, index) => (
        <span key={index} className="street">
          {street}
          {index < path.streets.length - 1 && (
            <span className="separator">-</span>
          )}
        </span>
      ))}
    </div>
  </div>
);

interface RouteProps {
  stops: Stop[];
  lineId: string;
}

const Route: React.FC<RouteProps> = ({ stops, lineId }) => {
  return (
    <div className="Route">
      Kierunek:{' '}
      <span className="finalStop">{stops[stops.length - 1].name}</span>
      <div className="routeContainer">
        {stops.map((stop, index) => (
          <StopDisplay
            key={`${stop.id || stop.group_id}-${index}`}
            stop={stop}
            lineId={lineId}
          />
        ))}
      </div>
    </div>
  );
};

const StopDisplay: React.FC<{ stop: Stop; lineId: string }> = ({ stop }) => {
  const stopType =
    stop.is_first && stop.is_optional
      ? 'first'
      : stop.is_last && stop.is_optional
        ? 'last'
        : stop.is_optional
          ? 'stop'
          : null;

  return (
    <div className="routeStop">
      <Link
        className="stop-realtime-link"
        title="wszystkie linie zatrzymujące sie przy tym zespole przystankowym"
        to={`/zespol-przystankowy/${stop.group_id}`}
      >
        <div className="stopOther">
          <img width="50%" src={displayIcon} alt="Tablica odjazdów" />
        </div>
      </Link>

      <div className="stopTime">
        {!stop.is_first && !stop.is_optional ? stop.travel_time : ' '}
      </div>

      <Link
        className="stop-timetable-link"
        to={`/rozklad-jazdy-wedlug-linii/${stop.route_id}/${stop.stop_number}`}
      >
        <div className="stopName">
          <div
            className={
              stop.is_first
                ? 'io first-stop'
                : stop.is_last
                  ? 'io last-stop'
                  : 'io'
            }
          >
            {stopType && <OptionalStop type={stopType} />}
            {stop.alias || stop.name}{' '}
          </div>
          {stop.is_on_request && <OnRequest />}
        </div>
      </Link>
    </div>
  );
};

export default LineTimetable;
