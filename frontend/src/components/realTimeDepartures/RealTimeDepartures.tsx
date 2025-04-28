import './RealTimeDepartures.css';
import { useParams } from 'react-router-dom';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import { useRealTimeDepartures } from '../../utils/departureUtils';

const RealTimeDepartures = () => {
  const { stopId } = useParams<{ stopId: string }>();
  const { departures, loading, currentTime, stop } =
    useRealTimeDepartures(stopId);

  return (
    <div className="RealTimeDepartures">
      {loading ? (
        <LoadingScreen />
      ) : (
        <>
          <div className="header">
            <h1></h1>
            <h1>
              {stop.name} ({stop.group_id}
              {stop.stop_id})
            </h1>
            <h2>
              {currentTime.hours}:{currentTime.minutes}
            </h2>
          </div>
          <div>
            {departures.length > 0 ? (
              departures.slice(0, 8).map((departure, index) => (
                <div
                  className="content"
                  key={`${departure.line?.name || departure.line_name}-${departure.departure_time}-${index}`}
                >
                  <div>{departure.line?.name || departure.line_name}</div>
                  <div>{departure.last_stop || departure.last_stop_name}</div>
                  <div
                    className={
                      departure.departure_text === '>>>' ? 'departing' : ''
                    }
                  >
                    {departure.departure_text === '>>>'
                      ? departure.departure_text
                      : departure.minutesUntil && departure.minutesUntil <= 30
                        ? departure.countdownText
                        : departure.isPast
                          ? `${departure.formattedTime} (jutro)`
                          : departure.formattedTime}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-departures">No upcoming departures</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RealTimeDepartures;
