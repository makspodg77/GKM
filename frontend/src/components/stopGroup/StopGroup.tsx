import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import service from '../../services/db';
import MiniRealTimeDepartures from '../miniRealTimeDepartures/MiniRealTimeDepartures';
import './StopGroup.css';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import SingleStopMap from '../singleStopMap/SingleStopMap';

const StopGroup = () => {
  const { stopId } = useParams<{ stopId: string }>();
  const [stopGroup, setStopGroup] = useState<any>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const FormatDepartureTime = (data: string) => {
    const now = new Date();
    now.setSeconds(0, 0);
    const time = new Date();
    time.setSeconds(0, 0);
    const [hours, minutes] = data.split(':').map(Number);
    time.setHours(hours, minutes, 0, 0);

    // Return an object with the time and a flag indicating if it's for today or tomorrow
    return {
      time: time,
      isPast: time < now,
      formattedTime: data,
    };
  };

  const updateCountdown = () => {
    // Ensure stopGroup exists and has items
    if (!stopGroup || !stopGroup.length) return;

    try {
      // Create a shallow copy of the array
      const updatedStopGroup = stopGroup.map((stop) => {
        // Add a safety check for stop.departures
        if (!stop || !stop.departures || !Array.isArray(stop.departures)) {
          console.warn('Invalid stop format:', stop);
          return stop;
        }

        return {
          ...stop,
          departures: Sort([...stop.departures]),
        };
      });

      // Only update if we have valid data
      if (updatedStopGroup && updatedStopGroup.length > 0) {
        setStopGroup(updatedStopGroup);
      }
    } catch (error) {
      console.error('Error in updateCountdown:', error);
    }
  };

  const Sort = (data: any) => {
    return data.sort((a: any, b: any) => {
      const timeA = FormatDepartureTime(a.departure_time);
      const timeB = FormatDepartureTime(b.departure_time);

      // First compare if one is past (tomorrow) and the other is future (today)
      if (timeA.isPast && !timeB.isPast) return 1; // A is tomorrow, B is today
      if (!timeA.isPast && timeB.isPast) return -1; // A is today, B is tomorrow

      // If both are on the same day, compare by time
      return timeA.time.getTime() - timeB.time.getTime();
    });
  };

  useEffect(() => {
    setIsLoading(true);
    service.getStopGroup(Number(stopId)).then((data) => {
      const processedData = data.map((stop) => ({
        ...stop,
        departures: Sort(stop.departures),
      }));
      console.log(processedData);
      setStopGroup(processedData);
      setIsLoading(false);
    });
  }, [stopId]);

  useEffect(() => {
    const interval = setInterval(updateCountdown, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Only set interval if we have data
    if (!stopGroup || !stopGroup.length) return;

    const interval = setInterval(updateCountdown, 5000); // 1 minute is enough
    return () => clearInterval(interval);
  }, [stopGroup]); // Add stopGroup as dependency

  return (
    <>
      {!isLoading ? (
        <div className="StopGroup">
          <h1>Zespół przystankowy "{stopGroup[0].stop.group_name}"</h1>
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
                <h4>ulica: {stop.stop.street}</h4>
                <MiniRealTimeDepartures id={stop.stop.stop_id} />
                <h3>Najbliższe odjazdy według rozkładu jazdy:</h3>
                <div>
                  {stop.departures.slice(0, 20).map((departure, idx) => {
                    const timeInfo = FormatDepartureTime(
                      departure.departure_time
                    );
                    console.log(departure);
                    return (
                      <div
                        className={`route ${timeInfo.isPast ? 'future-departure' : ''}`}
                        key={idx}
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
                  })}
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
