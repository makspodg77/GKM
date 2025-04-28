import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import './LineRoute.css';
import service from '../../services/db';
import arrowFart from '../../assets/tablica.png';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import onRequestIcon from '../../assets/on_request.png';
import PageTitle from '../common/pageTitle/PageTitle';

interface Stop {
  stop_id: string;
  stop_number: number;
  stop_group_id: string;
  name: string;
  is_on_request: boolean;
  route_id: string;
  travel_time: number;
  departure_time: string;
}

interface RouteData {
  lineInfo: {
    name: string;
    name_singular: string;
    color: string;
  };
  stops: Stop[];
}

const LineRoute = () => {
  const { timetableId, lineId, stopNumber } = useParams<{
    timetableId: string;
    lineId: string;
    stopNumber: string;
  }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);

  useEffect(() => {
    setLoading(true);

    if (!lineId || !timetableId) {
      setError('Brak wymaganych parametrów trasy');
      setLoading(false);
      return;
    }

    service
      .getRoute(Number(lineId), Number(timetableId))
      .then((data) => {
        if (!data || !data.stops) {
          setError('Nie znaleziono danych dla tej trasy');
          return;
        }
        setRoute(data);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to load route:', err);
        setError('Nie udało się załadować danych trasy');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [lineId, timetableId]);

  if (loading) return <LoadingScreen />;
  if (error) return <div className="error-message">{error}</div>;
  if (!route) return <div className="not-found">Nie znaleziono trasy</div>;

  const { travelTimes, currentStopIndex } = calculateTravelTimes(
    route.stops,
    stopNumber
  );

  return (
    <div className="LineRoute">
      <PageTitle
        title={`Przebieg kursu linii ${route.lineInfo?.name}`}
        type={route.lineInfo?.name_singular}
        color={route.lineInfo?.color}
      />

      <div className="routeContainer">
        {route.stops.map((stop, index) => {
          const isPastStop =
            currentStopIndex !== -1 && index < currentStopIndex;
          const isCurrentStop = currentStopIndex === index;
          const isAfterCurrentStop =
            currentStopIndex !== -1 && index > currentStopIndex;

          return (
            <div
              key={`${stop.stop_id}-${index}`}
              className={`route-stop ${isCurrentStop ? 'current' : ''} ${isPastStop ? 'past' : ''}`}
            >
              <div className="stop-order">
                {isAfterCurrentStop && <span>{index - currentStopIndex}</span>}
              </div>
              <div className="stop-departures">
                <Link
                  to={`/zespol-przystankowy/${stop.stop_group_id}`}
                  title="Wszystkie linie zatrzymujące się przy tym zespole przystankowym"
                  aria-label={`Tablica odjazdów dla przystanku ${stop.name}`}
                >
                  <img src={arrowFart} width="100%" alt="Tablica odjazdów" />
                </Link>
              </div>
              <div className={`stop-name ${isPastStop ? 'passed' : ''}`}>
                <Link
                  to={`/rozklad-jazdy-wedlug-linii/${stop.route_id}/${stop.stop_number}`}
                >
                  {stop.name}
                  {stop.is_on_request && (
                    <img
                      src={onRequestIcon}
                      title="Przystanek na żądanie"
                      alt="Na żądanie"
                    />
                  )}
                  <span className="stop-id">
                    ({stop.stop_group_id}/{stop.stop_id})
                  </span>
                </Link>
              </div>
              <div className="travel-time">
                {isCurrentStop ? (
                  <span className="current-indicator">↓</span>
                ) : (
                  isAfterCurrentStop && <span>{travelTimes[index]} min</span>
                )}
              </div>
              <div className="departure-time">{stop.departure_time}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function calculateTravelTimes(
  stops: Stop[],
  currentStopNumber?: string | null
): {
  travelTimes: number[];
  currentStopIndex: number;
} {
  const travelTimes: number[] = Array(stops.length).fill(0);
  let currentStopIndex = -1;

  currentStopIndex = stops.findIndex(
    (stop) => stop.stop_number.toString() === currentStopNumber
  );

  let cumulativeTime = 0;
  for (let i = currentStopIndex + 1; i < stops.length; i++) {
    cumulativeTime += stops[i].travel_time;
    travelTimes[i] = cumulativeTime;
  }

  return { travelTimes, currentStopIndex };
}

export default LineRoute;
