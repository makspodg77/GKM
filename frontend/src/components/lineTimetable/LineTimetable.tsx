import { useEffect, useState } from 'react';
import './LineTimetable.css';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import service, { LineDetailCategory, Stop } from '../../services/db';
import displayIcon from '../../assets/tablica.png';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import MapRouteDisplay from '../mapDisplay/MapRouteDisplay'; // Import the new component
import firstIcon from '../../assets/first.png';
import optionalIcon from '../../assets/optional.png';
import lastIcon from '../../assets/last.png';
import onRequestIcon from '../../assets/on_request.png';
import PageTitle from '../common/pageTitle/PageTitle';

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

  useEffect(() => {
    if (lineId) {
      setLoading(true);
      service
        .getLineRoutes(Number(lineId))
        .then((data: LineDetailCategory | LineDetailCategory[]) => {
          if (!data || (Array.isArray(data) && data.length === 0)) {
            setError('Nie znaleziono danych dla tej linii');
            return;
          }
          const formattedData = Array.isArray(data) ? data : [data];
          setLine(formattedData as LineTimetableData[]);
          setError(null);
        })
        .catch((error) => {
          console.error('Error fetching route:', error);
          setError('Wystąpił problem podczas ładowania danych linii');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [lineId]);

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

      <MapRouteDisplay
        routes={line.map((path) =>
          path.stops.map((stop) => ({
            ...stop,
            map: stop.map || '',
            street: stop.street || '',
          }))
        )}
        colors={[line[0].line.color || '#e74c3c']}
      />
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

const StopDisplay: React.FC<{ stop: Stop; lineId: string }> = ({
  stop,
  lineId,
}) => {
  const stopIconType =
    stop.is_first && stop.is_optional
      ? firstIcon
      : stop.is_last && stop.is_optional
        ? lastIcon
        : stop.is_optional
          ? optionalIcon
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
              stop.is_first ? 'first-stop' : stop.is_last ? 'last-stop' : ''
            }
          >
            {stopIconType && <img src={stopIconType} alt="Typ przystanku" />}
            {stop.name}{' '}
          </div>
          {stop.is_on_request && (
            <img
              src={onRequestIcon}
              title="Przystanek na żądanie"
              alt="Przystanek na żądanie"
            />
          )}
        </div>
      </Link>
    </div>
  );
};

export default LineTimetable;
