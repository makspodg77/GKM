import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import service, { DepartureData, StopData } from '../../services/db';
import MiniRealTimeDepartures from '../miniRealTimeDepartures/MiniRealTimeDepartures';
import './StopGroup.css';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import SingleStopMap from '../singleStopMap/SingleStopMap';
import PageTitle from '../common/pageTitle/PageTitle';

const StopGroup = () => {
  const { stopId } = useParams<{ stopId: string }>();
  const [stopGroup, setStopGroup] = useState<StopData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const FormatDepartureTime = (data: string) => {
    const now = new Date();
    now.setSeconds(0, 0);
    const time = new Date();
    time.setSeconds(0, 0);
    const [hours, minutes] = data.split(':').map(Number);
    time.setHours(hours, minutes, 0, 0);

    return {
      time: time,
      isTomorrow: time < now,
      formattedTime: data,
    };
  };

  const updateCountdown = () => {
    if (!stopGroup || !stopGroup.length) return;

    try {
      const updatedStopGroup = stopGroup.map((stop) => {
        if (!stop || !stop.departures || !Array.isArray(stop.departures)) {
          console.warn('Invalid stop format:', stop);
          return stop;
        }

        return {
          ...stop,
          departures: Sort([...stop.departures]),
        };
      });

      if (updatedStopGroup && updatedStopGroup.length > 0) {
        setStopGroup(updatedStopGroup);
      }
    } catch (error) {
      console.error('Error in updateCountdown:', error);
    }
  };

  const Sort = useCallback((data: DepartureData[]) => {
    return [...data].sort((a, b) => {
      const timeA = FormatDepartureTime(a.departure_time);
      const timeB = FormatDepartureTime(b.departure_time);

      if (timeA.isTomorrow && !timeB.isTomorrow) return 1;
      if (!timeA.isTomorrow && timeB.isTomorrow) return -1;

      return timeA.time.getTime() - timeB.time.getTime();
    });
  }, []);

  useEffect(() => {
    setIsLoading(true);

    service
      .getStopGroup(Number(stopId))
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          setError('Nie znaleziono przystanków w tej grupie');
          return;
        }

        const processedData = data.map((stop: StopData) => ({
          ...stop,
          departures: Sort(stop.departures),
        }));
        setStopGroup(processedData);
        setError(null);
      })
      .catch((err) => {
        console.error('Error fetching stop group:', err);
        setError('Wystąpił błąd podczas ładowania danych przystanku');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [stopId, Sort]);

  useEffect(() => {
    if (!stopGroup || !stopGroup.length) return;

    const interval = setInterval(updateCountdown, 5000);
    return () => clearInterval(interval);
  }, [stopGroup]);

  const Departure = ({ departure }: { departure: DepartureData }) => {
    const timeInfo = FormatDepartureTime(departure.departure_time);

    return (
      <div
        className={`route ${timeInfo.isTomorrow ? 'tomorrow-departure' : 'today-departure'}`}
      >
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
            {departure.last_stop}
          </Link>
        </div>
        <div>{timeInfo.formattedTime}</div>
      </div>
    );
  };

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
            Ten zespoł składa się z {stopGroup.length}{' '}
            {stopGroup.length > 1 ? 'przystanków' : 'przystanku'}
          </h4>
          <div className="stopContainer">
            {stopGroup.map((stop, index) => (
              <div key={index} className="stop">
                <SingleStopMap
                  coordinates={stop.stop.map || '14.77, 53.46'}
                  name={stop.stop.group_name}
                  street={stop.stop.street}
                  stopId={stop.stop.stop_id}
                  color="#e74c3c"
                />
                <h3>
                  Przystanek nr {stop.stop.group_id + '/' + stop.stop.stop_id}
                </h3>
                <h4>ulica/lokalizacja: {stop.stop.street}</h4>
                <MiniRealTimeDepartures id={stop.stop.stop_id} />
                <h3>Najbliższe odjazdy według rozkładu jazdy:</h3>
                <div>
                  {stop.departures && stop.departures.length > 0 ? (
                    stop.departures
                      .slice(0, 20)
                      .map((departure, idx) => (
                        <Departure key={idx} departure={departure} />
                      ))
                  ) : (
                    <div>Brak najbliższych odjazdów z tego przystanku</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <LoadingScreen />
      )}
    </>
  );
};

export default StopGroup;
