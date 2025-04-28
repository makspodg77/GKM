import './RealTimeDepartures.css';
import { useParams, Link } from 'react-router-dom';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import { useRealTimeDepartures } from '../../utils/departureUtils';

interface Departure {
  line?: { name: string };
  line_name?: string;
  last_stop?: string;
  last_stop_name?: string;
  departure_time: string;
  departure_text?: string;
  minutesUntil?: number;
  countdownText?: string | null;
  formattedTime?: string;
  isPast?: boolean;
}

interface StopInfo {
  name: string;
  group_id: string | number;
  stop_id: string | number;
}

// Create a separate component for each departure
const DepartureItem = ({
  departure,
  index,
}: {
  departure: Departure;
  index: number;
}) => {
  const departureTime =
    departure.departure_text === '>>>' ? (
      <span className="departing-now">{departure.departure_text}</span>
    ) : departure.minutesUntil && departure.minutesUntil <= 30 ? (
      <span className="countdown">{departure.countdownText}</span>
    ) : departure.isPast ? (
      <span className="tomorrow">{departure.formattedTime}</span>
    ) : (
      <span className="scheduled">{departure.formattedTime}</span>
    );

  return (
    <div
      className="departure-row"
      key={`${departure.line?.name || departure.line_name}-${departure.departure_time}-${index}`}
    >
      <div className="line-name">
        {departure.line?.name || departure.line_name}
      </div>
      <div className="destination">
        {departure.last_stop || departure.last_stop_name}
      </div>
      <div className={departure.departure_text === '>>>' ? 'departing' : ''}>
        {departureTime}
      </div>
    </div>
  );
};

const RealTimeDepartures: React.FC = () => {
  const { stopId } = useParams<{ stopId: string }>();
  const { departures, loading, currentTime, stop } = useRealTimeDepartures(
    stopId ?? null
  );

  if (loading) return <LoadingScreen />;

  return (
    <div className="RealTimeDepartures">
      <header className="stop-header">
        <div className="stop-info">
          <h1>
            {stop.name}
            <span className="stop-id">
              ({stop.group_id}/{stop.stop_id})
            </span>
          </h1>
        </div>
        <div className="current-time">
          <h2>
            {currentTime.hours}:
            {currentTime.minutes.toString().padStart(2, '0')}
          </h2>
        </div>
      </header>

      <div
        className="departures-container"
        role="table"
        aria-label="Lista odjazdów"
      >
        {departures.length > 0 ? (
          <div role="rowgroup">
            {departures.slice(0, 8).map((departure, index) => (
              <DepartureItem key={index} departure={departure} index={index} />
            ))}
          </div>
        ) : (
          <div className="no-departures" role="row">
            <div role="cell">Brak najbliższych odjazdów</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeDepartures;
