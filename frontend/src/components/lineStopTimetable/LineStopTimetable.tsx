import { useEffect, useState, useRef } from 'react';
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
    departure_id: number;
    departure_time: string;
    isToday?: boolean;
  } | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<DepartureTime | null>(null);
  const intervalsRef2 = useRef<NodeJS.Timeout[]>([]);
  const [isStopShow, setIsStopShown] = useState(false);
  let travelTime = 0;
  interface departureType {
    departure_time: string;
    departure_id: number;
  }
  const calculateTimeDifference = (departureTime: departureType) => {
    const now = new Date();
    const [hours, minutes] = departureTime.departure_time
      .split(':')
      .map((time) => parseInt(time));
    const departure = new Date();
    departure.setHours(hours, minutes, 0, 0);

    let diffMs = departure.getTime() - now.getTime();

    // If the departure is tomorrow (not today)
    if (!departureTime.isToday) {
      departure.setDate(departure.getDate() + 1);
      diffMs = departure.getTime() - now.getTime();
    } else if (diffMs < 0) {
      // If it's negative but within 1 minute, consider it as "now"
      if (diffMs > -60000) {
        // within 1 minute in the past
        return 0; // Return 0 to indicate "teraz"
      }
      // Otherwise, it must be tomorrow
      departure.setDate(departure.getDate() + 1);
      diffMs = departure.getTime() - now.getTime();
    }

    const diffMinutes = Math.round(diffMs / 60000);
    return diffMinutes;
  };

  const Sort = (data: departureType[]) => {
    data = [...data].sort((a, b) => {
      const [hoursA, minutesA] = a.departure_time.split(':').map(Number);
      const [hoursB, minutesB] = b.departure_time.split(':').map(Number);
      return hoursA * 60 + minutesA - (hoursB * 60 + minutesB);
    });
    return data;
  };

  // Function to handle already formatted departures by hour
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

        // Create hour key
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

    // If it's neither an object nor array, return empty object
    console.error('Invalid departures format:', departures);
    return {};
  };

  // Function to flatten hour-based departures back to a list
  const flattenDepartures = (departuresByHour: {
    [hour: string]: any[];
  }): any[] => {
    const flatList: any[] = [];

    Object.keys(departuresByHour).forEach((hour) => {
      departuresByHour[hour]?.forEach((departure) => {
        flatList.push({
          departure_time: `${hour.padStart(2, '0')}:${departure.departure_time}`,
          departure_id: departure.timetable_id,
          signature: departure.signature,
          color: departure.color,
          route_id: departure.route_id,
        });
      });
    });

    return Sort(flatList);
  };

  useEffect(() => {
    intervalsRef2.current.forEach((interval) => clearInterval(interval));
    intervalsRef2.current = [];

    if (nextDeparture) {
      const updateCountdown = () => {
        const newTimeDiff = calculateTimeDifference(nextDeparture);
        setCountdown(newTimeDiff.toString());

        // If current time is past the departure time (including the 1-minute grace period)
        if (newTimeDiff <= 0) {
          // If it's exactly 0, wait 60 seconds before checking for the next departure
          const delayBeforeNextDeparture = newTimeDiff === 0 ? 60000 : 1000;

          setTimeout(() => {
            // We need to re-flatten the departures here
            const flattenedDepartures = flattenDepartures(departureTimes);
            const nextTime = nearestDepartureTime(flattenedDepartures);
            setNextDeparture(nextTime);
          }, delayBeforeNextDeparture);
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 15000); // Check more frequently (every 15 seconds)
      intervalsRef2.current.push(interval);
    }

    return () => {
      intervalsRef2.current.forEach((interval) => clearInterval(interval));
      intervalsRef2.current = [];
    };
  }, [nextDeparture, departureTimes]);

  const nearestDepartureTime = (departureTimes: departureType[]) => {
    if (!departureTimes || departureTimes.length === 0) {
      return null;
    }

    const now = new Date();
    now.setSeconds(0, 0);

    // First, check for departures later today
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

    // If we get here, there are no more departures today
    // Return the first departure for tomorrow
    return {
      ...departureTimes[0],
      isToday: false,
    };
  };

  useEffect(() => {
    setLoading(true);
    if (!stopNumber || !routeId) {
      return;
    }
    service
      .getLineStop(routeId, stopNumber)
      .then((data) => {
        console.log(data);
        setTimetable(data);

        const departuresByHour = organizeDeparturesByHour(data.departures);
        setDepartureTimes(departuresByHour);

        // Use the flattened list to find the nearest departure
        const flattenedDepartures = flattenDepartures(departuresByHour);
        setNextDeparture(nearestDepartureTime(flattenedDepartures));

        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching route:', error);
        setLoading(false);
      });
  }, [stopNumber, routeId]);

  if (loading) {
    return <LoadingScreen />;
  }

  let condition = Number(
    timetable?.stops.find((obj) => obj.stop_number == stopNumber)?.stop_number
  );

  const selected = { backgroundColor: '#009788', color: 'white' };
  const fromHour = 4;
  const toHour = 23;

  return (
    <div className="LineStopTimetable">
      <div className="left">
        <h1>Rozkład jazdy linii {timetable?.line.name}</h1>
        <div className="lineType">
          <div
            className="type-color"
            style={{ backgroundColor: timetable?.line.color }}
          ></div>
          {timetable?.line.name_singular}
        </div>
        <div className="stopName">
          <div className="buttonContainer">
            <button
              onClick={() => setIsStopShown(!isStopShow)}
              title="Lokalizacja przystanku"
            >
              <img src={locationIcon} width="20px"></img>
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
            coordinates={timetable.stop.map || '14.77, 53.46'}
            name={timetable.stop.name}
            street={timetable.stop.street}
            stopId={timetable.stop.stop_id}
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
                  {timetable.other_lines.map((line) => (
                    <Link
                      key={line.route_number}
                      to={`/rozklad-jazdy-wedlug-linii/${line.route_id}/${line.stop_number}`}
                    >
                      <div className="otherLine nextDeparture" key={line.name}>
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
                  to={`/rozklad-jazdy-wedlug-linii/kurs/${nextDeparture.departure_id}`}
                >
                  {nextDeparture.departure_time}
                </Link>
                {nextDeparture.isToday
                  ? ` (za ${countdown} minut)`
                  : ` (za ${countdown} minut, jutro)`}
              </>
            ) : (
              <>
                <Link
                  className="nextDeparture"
                  to={`/rozklad-jazdy-wedlug-linii/kurs/${nextDeparture.departure_id}`}
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
        <MiniRealTimeDepartures id={timetable?.stop.stop_id} />
        <div className="table-container">
          <table>
            <thead>
              <tr>
                {Array.from({ length: toHour - fromHour + 1 }, (_, index) => (
                  <th key={index}>{fromHour + index}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {Array.from({ length: toHour - fromHour + 1 }, (_, index) => {
                  const hour = (fromHour + index).toString();
                  return (
                    <td key={index}>
                      <div>
                        {departureTimes[hour]?.map((time) => (
                          <Link
                            key={time.timetable_id}
                            to={`/rozklad-jazdy-wedlug-linii/kurs/${timetable.line.id}/${time.timetable_id}/${timetable.stop.stop_number}`}
                          >
                            <div
                              style={{
                                backgroundColor:
                                  `${hour.padStart(2, '0')}:${time.departure_time}` ===
                                  nextDeparture?.departure_time
                                    ? '#FACF00'
                                    : '',
                                color:
                                  time.color !== '#3498db'
                                    ? time.color
                                    : 'inherit',
                              }}
                            >
                              {time.departure_time}
                              {time.signature != 'Podstawowy' ? (
                                <div className="signature">
                                  {time.signature}
                                </div>
                              ) : (
                                <></>
                              )}
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
        {timetable.signatures.length > 1 ||
        !timetable.signatures.find(
          (signature) => signature.signature == 'Podstawowy'
        ) ? (
          <>
            <span className="bold">Objaśnienia:</span>
            <div>
              {timetable.signatures
                .filter((signature) => signature.signature != 'Podstawowy')
                .map((signature) => (
                  <div style={{ color: signature.color }}>
                    {signature.signature +
                      '  ' +
                      signature.signature_explanation}
                  </div>
                ))}
            </div>
          </>
        ) : (
          <></>
        )}
        <br /> Operator: PKS Kamień Pomorski
      </div>
      <div className="right">
        {timetable?.stops.map((stop, index) => (
          <div key={index}>
            <Link
              to={`/zespol-przystankowy/${stop.stop_group_id}`}
              title="wszystkie linie zatrzymujące sie przy tym zespole przystankowym"
            >
              <div className="stopOther">
                <img width="75%" src={displayIcon} />
              </div>
            </Link>
            <div
              className="totalTravelTime"
              style={
                index + 1 >= condition && !stop.is_optional ? selected : {}
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
                to={`/rozklad-jazdy-wedlug-linii/${timetable.stop.route_id}/${stop.stop_number}`}
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
    </div>
  );
};

export default LineStopTimetable;
