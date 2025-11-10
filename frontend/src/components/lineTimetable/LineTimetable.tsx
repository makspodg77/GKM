import React, { useEffect, useState, useMemo, useRef } from 'react';
import './LineTimetable.css';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import service, { LineDetailCategory, Stop } from '../../services/db';
import displayIcon from '../../assets/tablica.png';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import MapRouteDisplay from '../mapDisplay/MapRouteDisplay';
import PageTitle from '../common/pageTitle/PageTitle';
import OptionalStop from '../common/symbols/OptionalStop';
import OnRequest from '../common/symbols/OnRequest';
import MapOneLineDisplay from '../mapDisplay/MapDisplay';
import busIcon from '../../assets/bus.svg';
import refreshIcon from '../../assets/refresh.svg';
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
  const [activeBuses, setActiveBuses] = useState([]);
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const fetchData = async () => {
      setSeconds(0);
      try {
        const result = await service.getAllActiveBusesForALine(lineId);
        setActiveBuses(result);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    service
      .getLineRoutes(lineId)
      .then((data) => {
        setLine(data);
        service.getAllRoutesForALine(lineId).then((data) => {
          const standardizedStops = data.map((obj: any) =>
            (obj.stops || []).map((stop: any) => {
              let lat = null,
                lon = null;
              if (typeof stop.map === 'string' && stop.map.trim().length > 0) {
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
          setRoutes(data.map((obj) => obj.map_routes));
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const addSecond = () => {
      setSeconds((prevSeconds) => prevSeconds + 1);
    };

    const interval = setInterval(addSecond, 1000);
    return () => clearInterval(interval);
  }, []);
  console.log(line);
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
        type={line[0]?.line.name_singular}
        color={line[0]?.line.color}
        title={`Rozkład jazdy linii ${line[0]?.line.name}`}
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
