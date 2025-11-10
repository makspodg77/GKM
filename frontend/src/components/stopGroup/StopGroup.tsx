import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import service, { DepartureData, StopData } from '../../services/db';
import MiniRealTimeDepartures from '../miniRealTimeDepartures/MiniRealTimeDepartures';
import './StopGroup.css';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import SingleStopMap from '../singleStopMap/SingleStopMap';
import PageTitle from '../common/pageTitle/PageTitle';
import { useRealTimeDepartures } from '../../utils/departureUtils';
import Loading from '../common/loadingScreen/Loading';

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

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <>
      {!isLoading ? (
        <div className="StopGroup" aria-live="polite">
          <PageTitle
            title={`Zespół przystankowy "${stopGroup[0]?.stop?.group_name || ''}"`}
          />
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

const StopCard = ({ stop_ }: { stop_: StopData }) => {
  const { stop, loading } = useRealTimeDepartures(stop_.stop.stop_id);

  if (loading) return <Loading />;

  const fallbackStop = stop_.stop;
  const stopName =
    stop.alias ||
    stop.name ||
    fallbackStop.alias ||
    fallbackStop.group_name ||
    fallbackStop.street ||
    '';
  const stopStreet = stop.street || fallbackStop.street || '';
  const stopMap = stop.map ?? fallbackStop.map ?? '';
  const stopId = stop.stop_id ?? fallbackStop.stop_id;
  const stopGroupId = stop.group_id ?? fallbackStop.group_id;

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
      {stop.alias || fallbackStop.alias ? (
        <h4 style={{ margin: '0' }}>
          Nazwa poboczna: {stop.alias || fallbackStop.alias}
        </h4>
      ) : (
        ''
      )}
      <h4>ulica/lokalizacja: {stopStreet}</h4>
      <MiniRealTimeDepartures id={stopId} />
      <h3>Najbliższe odjazdy według rozkładu jazdy:</h3>

      {stop_.departures && stop_.departures.length > 0 ? (
        stop_.departures
          .slice(0, 20)
          .map((departure, idx) => (
            <Departure key={idx} departure={departure} />
          ))
      ) : (
        <div>Brak najbliższych odjazdów z tego przystanku</div>
      )}
    </div>
  );
};

const Departure = ({ departure }: { departure: DepartureData }) => {
  return (
    <div className="route">
      <div className="line-name">
        <div
          className="type-color"
          style={{ backgroundColor: departure.line.color }}
        ></div>
        {departure.line.name}
      </div>
      <div>
        <Link
          to={`/rozklad-jazdy-wedlug-linii/${departure.route_id}/${departure.stop_number}`}
          className="destination-link"
        >
          {departure.alias || departure.last_stop}
        </Link>
      </div>
      <div>{departure.departure_time}</div>
    </div>
  );
};

export default StopGroup;
