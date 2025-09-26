import './RealTimeDepartures.css';
import { useParams } from 'react-router-dom';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import { useRealTimeDepartures } from '../../utils/departureUtils';
import herbGoleniow from '../../assets/Herb-Goleniowa.png';
import herbNowogard from '../../assets/Herb-Nowogardu.png';
import herbMaszewo from '../../assets/Herb-Maszewa.png';
import herbOsina from '../../assets/Herb-Osiny.png';
import herbPrzybiernow from '../../assets/Herb-Przybiernowa.png';
import herbStepnica from '../../assets/Herb-Stepnicy.png';
import herbSzczecin from '../../assets/Herb-Szczecina.png';
const municipalities = [
  {
    id: 1,
    style: {
      background:
        'linear-gradient(90deg,rgba(10, 63, 137, 1) 0%, rgba(250, 207, 0, 1) 100%)',
    },
    emblem: herbGoleniow,
  },
  {
    id: 3,
    style: {
      background:
        'linear-gradient(145deg,rgba(8, 178, 239, 1) 0%, rgba(122, 107, 143, 1) 35%, rgba(236, 36, 47, 1) 100%)',
    },
    emblem: herbMaszewo,
  },
  {
    id: 2,
    style: {
      background:
        'linear-gradient(145deg,rgba(255, 241, 0, 1) 0%, rgba(246, 139, 24, 1) 35%, rgba(236, 36, 47, 1) 100%)',
    },
    emblem: herbNowogard,
  },
  {
    id: 5,
    style: {
      background:
        'linear-gradient(145deg,rgba(0, 109, 158, 1) 0%, rgba(0, 134, 106, 1) 35%, rgba(0, 158, 54, 1) 100%)',
    },
    emblem: herbStepnica,
  },
  {
    id: 4,
    style: {
      background:
        'linear-gradient(90deg,rgba(254, 255, 254, 1) 0%, rgba(127, 202, 238, 1) 35%, rgba(0, 148, 222, 1) 100%)',
    },
    emblem: herbPrzybiernow,
  },
  {
    id: 6,
    style: {
      background:
        'linear-gradient(145deg,rgba(254, 255, 254, 1) 0%, rgba(254, 250, 127, 1) 35%, rgba(254, 248, 64, 1) 100%)',
    },
    emblem: herbOsina,
  },
  {
    id: 7,
    style: {
      background:
        'linear-gradient(90deg,rgba(213, 43, 10, 1) 0%, rgba(107, 48, 80, 1) 35%, rgba(0, 52, 150, 1) 100%)',
    },
    emblem: herbSzczecin,
  },
];

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
      <div className="background">
        <div className="sign">
          <header className="stop-header">
            <div
              className="stop-info"
              style={
                municipalities.find((x) => x.id == stop.municipality)?.style ??
                municipalities.find((x) => x.id == 1)?.style
              }
            >
              <img
                className="munip"
                src={
                  municipalities.find((x) => x.id == stop.municipality)
                    ?.emblem ?? herbGoleniow
                }
              />
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
          <div className="legend">
            <div>Linia</div>
            <div>Kierunek</div>
            <div>Odjazd</div>
          </div>
          <div
            className="departures-container"
            role="table"
            aria-label="Lista odjazdów"
          >
            {departures.length > 0 ? (
              <div role="rowgroup">
                {departures.slice(0, 6).map((departure, index) => (
                  <DepartureItem
                    key={index}
                    departure={departure}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="no-departures" role="row">
                <div role="cell">Brak najbliższych odjazdów</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeDepartures;
