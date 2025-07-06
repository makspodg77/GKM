import { useEffect, useState, useRef, useCallback } from 'react';
import './LineStopTimetable.css';
import { useParams, Link } from 'react-router-dom';
import service, { DepartureTime } from '../../services/db';
import displayIcon from '../../assets/tablica.png';
import MiniRealTimeDepartures from '../miniRealTimeDepartures/MiniRealTimeDepartures';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import firstIcon from '../../assets/first.png';
import optionalIcon from '../../assets/optional.png';
import lastIcon from '../../assets/last.png';
import routeIcon from '../../assets/route.svg';
import locationIcon from '../../assets/location.svg';
import SingleStopMap from '../singleStopMap/SingleStopMap';
import onRequestIcon from '../../assets/on_request.png';
import PageTitle from '../common/pageTitle/PageTitle';

interface HourlyDepartureTableProps {
  fromHour: number;
  toHour: number;
  departureTimes: {
    [hour: string]: {
      departure_time: string;
      signature: string;
      color: string;
      timetable_id: string;
      route_id: string;
    }[];
  };
  nextDeparture: {
    departure_time: string;
    timetable_id: number | string;
  } | null;
  timetable: DepartureTime | null;
}

const HourlyDepartureTable = ({
  fromHour,
  toHour,
  departureTimes,
  nextDeparture,
  timetable,
}: HourlyDepartureTableProps) => {
  const isNightRoute = timetable?.is_night && fromHour > toHour;

  const hoursArray = isNightRoute
    ? [
        ...Array.from({ length: 24 - fromHour + 1 }, (_, i) => fromHour + i),
        ...Array.from({ length: toHour + 1 }, (_, i) => i),
      ]
    : Array.from({ length: toHour - fromHour + 1 }, (_, i) => fromHour + i);

  return (
    <div className="table-container">
      <table aria-label="Rozkład odjazdów według godzin">
        <thead>
          <tr>
            {hoursArray.map((hour, index) => (
              <th key={index}>{hour}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {hoursArray.map((hour, index) => {
              const hourStr = hour.toString();
              return (
                <td key={index}>
                  <div>
                    {departureTimes[hourStr]?.map((time) => (
                      <Link
                        key={time.timetable_id}
                        to={
                          timetable?.line?.id
                            ? `/rozklad-jazdy-wedlug-linii/kurs/${timetable.line.id}/${time.timetable_id}/${timetable.stop.stop_number}`
                            : '#'
                        }
                      >
                        <div
                          style={{
                            backgroundColor:
                              `${hourStr.padStart(2, '0')}:${time.departure_time}` ===
                              nextDeparture?.departure_time
                                ? '#FACF00'
                                : '',
                            color:
                              time.color !== '#3498db' ? time.color : 'inherit',
                          }}
                        >
                          <div className="departureMinutes">
                            {time.departure_time}
                            {time.signature != 'Podstawowy' ? (
                              <div className="signature">{time.signature}</div>
                            ) : (
                              <></>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

interface Stop {
  stop_group_id: string;
  is_optional: boolean;
  travel_time: string;
  stop_number: string;
  is_first: boolean;
  is_last: boolean;
  is_on_request: boolean;
  name: string;
}

const StopsList = ({
  stops,
  condition,
  timetable,
}: {
  stops: Stop[];
  condition: number;
  timetable: any;
}) => {
  let travelTime = 0;
  const selected = { backgroundColor: '#009788', color: 'white' };

  return (
    <div className="right">
      {stops.map((stop, index) => (
        <div key={index}>
          <Link
            to={`/zespol-przystankowy/${stop.stop_group_id}`}
            title="wszystkie linie zatrzymujące sie przy tym zespole przystankowym"
          >
            <div className="stopOther">
              <img src={displayIcon} alt="Tablica odjazdów" width="75%" />
            </div>
          </Link>
          <div
            className="totalTravelTime"
            style={
              index + 1 >= condition &&
              (!stop.is_optional || index + 1 == condition)
                ? selected
                : {}
            }
          >
            {index >= condition && !stop.is_optional
              ? (travelTime = travelTime + Number(stop.travel_time))
              : ''}
          </div>
          <div
            className="travelTime"
            style={index + 1 == condition ? selected : {}}
          >
            {stop.is_optional ? <></> : stop.travel_time}
          </div>
          <div
            className="stopName"
            style={index + 1 == condition ? selected : {}}
          >
            <Link
              style={index + 1 == condition ? selected : {}}
              to={`/rozklad-jazdy-wedlug-linii/${timetable.stop.route_id}/${index + 1}`}
            >
              {stop.is_first && stop.is_optional ? (
                <img src={firstIcon} />
              ) : stop.is_last && stop.is_optional ? (
                <img src={lastIcon} />
              ) : stop.is_optional ? (
                <img src={optionalIcon} />
              ) : (
                ''
              )}
              {stop.is_first || stop.is_last ? (
                <span className="finalStops">{stop.name}</span>
              ) : (
                stop.name
              )}
              {stop.is_on_request ? (
                <img src={onRequestIcon} title="Przystanek na żądanie" />
              ) : (
                ''
              )}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};

const formatCountdown = (countdown: string, isToday: boolean) => {
  const minutes = Number(countdown);

  if (minutes <= 0) return '(teraz)';

  if (minutes <= 60) {
    return isToday ? ` (za ${minutes} minut)` : ` (za ${minutes} minut, jutro)`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  let hourText;
  if (hours === 1) {
    hourText = 'godzinę';
  } else if (hours < 5) {
    hourText = 'godziny';
  } else {
    hourText = 'godzin';
  }

  let minuteText;
  if (remainingMinutes == 1) {
    minuteText = 'minutę';
  } else if (remainingMinutes < 5) {
    minuteText = 'minuty';
  } else {
    minuteText = 'minut';
  }

  const timeText = ` (za ${hours} ${hourText} ${remainingMinutes} ${minuteText}${isToday ? '' : ', jutro'})`;
  return timeText;
};

const calculateTimeDifference = (
  departureTime: {
    timetable_id?: number;
    departure_time: any;
    isToday?: boolean | undefined;
  },
  isToday = true
) => {
  const now = new Date();
  const [hours, minutes] = departureTime.departure_time
    .split(':')
    .map((time: string) => parseInt(time));
  const departure = new Date();
  departure.setHours(hours, minutes, 0, 0);

  let diffMs = departure.getTime() - now.getTime();

  if (!isToday) {
    departure.setDate(departure.getDate() + 1);
    diffMs = departure.getTime() - now.getTime();
  } else if (diffMs < 0) {
    if (diffMs > -60000) {
      return 0;
    }
    departure.setDate(departure.getDate() + 1);
    diffMs = departure.getTime() - now.getTime();
  }

  const diffMinutes = Math.round(diffMs / 60000);
  return diffMinutes;
};

const LineStopTimetable = () => {
  const { routeId, stopNumber } = useParams<{
    stopNumber: string;
    routeId: string;
  }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [departureTimes, setDepartureTimes] = useState<{
    [hour: string]: {
      departure_time: string;
      signature: string;
      color: string;
      timetable_id: string;
      route_id: string;
    }[];
  }>({});
  const [nextDeparture, setNextDeparture] = useState<{
    departure_time: string;
    timetable_id: number;
    isToday?: boolean;
  } | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<DepartureTime | null>(null);
  const intervalsRef2 = useRef<NodeJS.Timeout[]>([]);
  const [isStopShow, setIsStopShown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  interface departureType {
    departure_time: string;
    timetable_id: number;
  }

  const Sort = (data: departureType[]) => {
    data = [...data].sort((a, b) => {
      const [hoursA, minutesA] = a.departure_time.split(':').map(Number);
      const [hoursB, minutesB] = b.departure_time.split(':').map(Number);
      return hoursA * 60 + minutesA - (hoursB * 60 + minutesB);
    });
    return data;
  };

  const organizeDeparturesByHour = (departures: {
    [hour: string]: {
      departure_time: string;
      signature: string;
      color: string;
      timetable_id: string;
      route_id: string;
    }[];
  }) => {
    if (
      departures &&
      typeof departures === 'object' &&
      !Array.isArray(departures)
    ) {
      return departures;
    }

    if (Array.isArray(departures)) {
      const departuresByHour: { [hour: string]: any[] } = {};

      departures.forEach((departure) => {
        const [hours, minutes] = departure.departure_time
          .split(':')
          .map(Number);

        const hourKey = hours.toString();

        if (!departuresByHour[hourKey]) {
          departuresByHour[hourKey] = [];
        }

        departuresByHour[hourKey].push({
          departure_time: minutes.toString().padStart(2, '0'),
          signature: departure.signature,
          color: departure.color,
          timetable_id: departure.departure_id.toString(),
          route_id: departure.route_id,
        });
      });

      return departuresByHour;
    }

    console.error('Invalid departures format:', departures);
    return {};
  };

  const flattenDepartures = useCallback(
    (departuresByHour: { [hour: string]: any[] }): any[] => {
      const flatList: any[] = [];

      Object.keys(departuresByHour).forEach((hour) => {
        departuresByHour[hour]?.forEach((departure) => {
          flatList.push({
            departure_time: `${hour.padStart(2, '0')}:${departure.departure_time}`,
            timetable_id: departure.timetable_id,
            signature: departure.signature,
            color: departure.color,
            route_id: departure.route_id,
          });
        });
      });

      return Sort(flatList);
    },
    []
  );

  useEffect(() => {
    intervalsRef2.current.forEach((interval) => clearInterval(interval));
    intervalsRef2.current = [];

    if (nextDeparture) {
      const updateCountdown = () => {
        const newTimeDiff = calculateTimeDifference(
          nextDeparture,
          nextDeparture.isToday
        );
        setCountdown(newTimeDiff.toString());

        if (newTimeDiff <= 0) {
          const delayBeforeNextDeparture = newTimeDiff === 0 ? 60000 : 1000;

          setTimeout(() => {
            const flattenedDepartures = flattenDepartures(departureTimes);
            const nextTime = nearestDepartureTime(flattenedDepartures);
            setNextDeparture(
              nextTime
                ? {
                    departure_time: nextTime.departure_time,
                    timetable_id: nextTime.timetable_id,
                    isToday: nextTime.isToday,
                  }
                : null
            );
          }, delayBeforeNextDeparture);
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 15000);
      intervalsRef2.current.push(interval);
    }

    return () => {
      intervalsRef2.current.forEach((interval) => clearInterval(interval));
      intervalsRef2.current = [];
    };
  }, [nextDeparture, departureTimes, flattenDepartures]);

  const nearestDepartureTime = (departureTimes: departureType[]) => {
    if (!departureTimes || departureTimes.length === 0) {
      return null;
    }

    const now = new Date();
    now.setSeconds(0, 0);

    for (const time of departureTimes) {
      const [hours, minutes] = time.departure_time.split(':').map(Number);
      const departureTime = new Date();
      departureTime.setHours(hours, minutes, 0, 0);

      if (departureTime > now) {
        return {
          ...time,
          isToday: true,
        };
      }
    }

    return {
      ...departureTimes[0],
      isToday: false,
    };
  };

  useEffect(() => {
    setLoading(true);
    if (!stopNumber || !routeId) {
      setError('Nieprawidłowy numer przystanku lub linii');
      setLoading(false);
      return;
    }

    service
      .getLineStop(routeId, stopNumber)
      .then((data) => {
        if (!data) {
          setError('Nie znaleziono danych rozkładu');
          return;
        }
        console.log(data);
        setTimetable(data);

        const departuresByHour = organizeDeparturesByHour(data.departures);
        setDepartureTimes(departuresByHour);

        const flattenedDepartures = flattenDepartures(departuresByHour);
        setNextDeparture(nearestDepartureTime(flattenedDepartures));
      })
      .catch((error) => {
        console.error('Error fetching route:', error);
        setError('Wystąpił błąd podczas ładowania rozkładu');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [stopNumber, routeId, flattenDepartures]);

  if (error) {
    return (
      <div className="error-container">
        <h2>Błąd</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  if (loading) {
    return <LoadingScreen />;
  }

  let condition = Number(
    timetable?.stops.find(
      (obj: { stop_number: number }) => obj.stop_number === Number(stopNumber)
    )?.stop_number
  );

  return (
    <div className="LineStopTimetable">
      <div className="left">
        <PageTitle
          type={timetable?.line.name_singular}
          color={timetable?.line.color}
          title={`Rozkład jazdy linii ${timetable?.line.name}`}
        />
        <div className="stopName">
          <div className="buttonContainer">
            <button
              onClick={() => setIsStopShown(!isStopShow)}
              title="Lokalizacja przystanku"
              aria-expanded={isStopShow}
              aria-controls="stop-map"
            >
              <img src={locationIcon} width="20px" alt="Pokaż lokalizację" />
            </button>
            <Link
              to={`/rozklad-jazdy-wedlug-linii/${timetable?.line.id}`}
              title="Pozostałe trasy tej linii"
            >
              <button>
                <img src={routeIcon} width="20px"></img>
              </button>
            </Link>
          </div>
          <span>
            <span className="bold">Przystanek</span>: {timetable?.stop.name} (
            {timetable?.stop.stop_group_id}/{timetable?.stop.stop_id})
          </span>
        </div>
        <div
          className="mapWrapper"
          style={{ display: isStopShow ? 'block' : 'none' }}
        >
          <SingleStopMap
            coordinates={timetable?.stop.map || '14.77, 53.46'}
            name={timetable?.stop.name || 'doris'}
            street={timetable?.stop.street}
            stopId={timetable?.stop.stop_id}
            color="#e74c3c"
          />
        </div>
        <div>
          <span className="bold">Kierunek</span>:{' '}
          {timetable?.last_stops.join(' lub ')}
        </div>
        <div>
          {Array.isArray(timetable?.other_lines) &&
            timetable.other_lines.length > 0 && (
              <div>
                <div>
                  <span className="bold">Inne linie na tym przystanku:</span>
                  {timetable.other_lines
                    .sort((a, b) => Number(a.name) - Number(b.name))
                    .map((line) => (
                      <Link
                        key={line.route_id}
                        to={`/rozklad-jazdy-wedlug-linii/${line.route_id}/${line.stop_number}`}
                      >
                        <div
                          className="otherLine nextDeparture"
                          key={line.name}
                        >
                          <div
                            className="type-color"
                            style={{ backgroundColor: line.color }}
                          ></div>
                          {line.name}
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            )}
        </div>
        <div>
          <span className="bold">Najbliższy odjazd</span>:{' '}
          {nextDeparture ? (
            countdown && Number(countdown) > 0 ? (
              <>
                <Link
                  className="nextDeparture"
                  to={`/rozklad-jazdy-wedlug-linii/kurs/${timetable?.line.id}/${nextDeparture.timetable_id}/${stopNumber}`}
                >
                  {nextDeparture.departure_time}
                </Link>
                {formatCountdown(countdown, nextDeparture.isToday || false)}
              </>
            ) : (
              <>
                <Link
                  className="nextDeparture"
                  to={`/rozklad-jazdy-wedlug-linii/kurs/${nextDeparture.timetable_id}`}
                >
                  {nextDeparture.departure_time}
                </Link>{' '}
                (teraz)
              </>
            )
          ) : (
            'Brak odjazdu'
          )}
        </div>
        {timetable?.stop.stop_id && (
          <MiniRealTimeDepartures id={timetable.stop.stop_id} />
        )}
        <HourlyDepartureTable
          fromHour={timetable?.is_night ? 22 : 4}
          toHour={timetable?.is_night ? 4 : 23}
          departureTimes={departureTimes}
          nextDeparture={nextDeparture}
          timetable={timetable}
        />
        {(timetable?.signatures?.length ?? 0) > 1 ||
        !timetable?.signatures?.find(
          (signature) => signature.signature == 'Podstawowy'
        ) ? (
          <>
            <span className="bold">Objaśnienia:</span>
            <div>
              {timetable?.signatures
                .filter((signature) => signature.signature != 'Podstawowy')
                .map((signature) => (
                  <div style={{ color: signature.color }}>
                    {signature.signature +
                      ' - ' +
                      signature.signature_explanation}
                  </div>
                ))}
            </div>
          </>
        ) : (
          <></>
        )}
        <br /> <span className="bold">Operator</span>: PKS Sp. z o.o. Kamień
        Pomorski
      </div>
      <StopsList
        stops={(timetable?.stops || []).map((stop) => ({
          ...stop,
          travel_time: stop.travel_time.toString(),
          stop_number: stop.stop_number.toString(),
        }))}
        condition={condition}
        timetable={timetable}
      />
    </div>
  );
};

export default LineStopTimetable;
