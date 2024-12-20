import { useEffect, useState, useRef } from 'react';
import './LineStopTimetable.css';
import { useParams, Link } from 'react-router-dom';
import service, { DepartureTime } from '../../services/db';
import displayIcon from '../../assets/tablica.png';
import MiniRealTimeDepartures from '../miniRealTimeDepartures/MiniRealTimeDepartures';
import returnIcon from '../../assets/przeciwny_kierunek.png';
import allIcon from '../../assets/wszystkie_trasy.png';

const LineStopTimetable = () => {
  const { lineId, stopId, routeId } = useParams<{
    lineId: string;
    stopId: string;
    routeId: string;
  }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [departureTimes, setDepartureTimes] = useState<
    { departure_time: string; departure_id: number }[][]
  >([]);
  const [nextDeparture, setNextDeparture] = useState<{
    departure_id: number;
    departure_time: string;
  } | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<DepartureTime | null>(null);
  const intervalsRef2 = useRef<NodeJS.Timeout[]>([]);

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
    if (diffMs < 0) {
      departure.setDate(departure.getDate() + 1);
      diffMs = departure.getTime() - now.getTime();
    }
    const diffMinutes = Math.round(diffMs / 60000);
    return diffMinutes;
  };

  const Sort = (data: departureType[]) => {
    data = data.sort((a, b) => {
      const [hoursA, minutesA] = a.departure_time.split(':').map(Number);
      const [hoursB, minutesB] = b.departure_time.split(':').map(Number);
      const dateA = new Date(1970, 0, 1, hoursA, minutesA);
      const dateB = new Date(1970, 0, 1, hoursB, minutesB);

      if (dateA.getTime() > dateB.getTime()) return 1;
      if (dateA.getTime() < dateB.getTime()) return -1;
      return 0;
    });
    return data;
  };

  useEffect(() => {
    intervalsRef2.current.forEach((interval) => clearInterval(interval));
    intervalsRef2.current = [];
    if (nextDeparture) {
      const updateCountdown = () => {
        const newTimeDiff = calculateTimeDifference(nextDeparture);
        setCountdown(newTimeDiff.toString());

        if (newTimeDiff <= 0) {
          setTimeout(() => {
            const nextTime = nearestDepartureTime(
              Sort(timetable!.departure_times)
            );
            setNextDeparture(nextTime);
          }, 60000);
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 60000);
      intervalsRef2.current.push(interval);
    }
    return () => {
      intervalsRef2.current.forEach((interval) => clearInterval(interval));
      intervalsRef2.current = [];
    };
  }, [nextDeparture, timetable]);

  const nearestDepartureTime = (departureTimes: departureType[]) => {
    const now = new Date();
    now.setSeconds(0, 0);
    for (const time of departureTimes) {
      const [hours, minutes] = time.departure_time.split(':').map(Number);
      const departureTime = new Date();
      departureTime.setHours(hours, minutes, 0, 0);

      if (departureTime > now) {
        return time;
      }
    }
    return departureTimes[0];
  };

  useEffect(() => {
    setLoading(true);
    if (!lineId || !stopId || !routeId) {
      return;
    }
    service
      .getDepartureTimes(stopId, routeId)
      .then((data) => {
        setTimetable(data);
        setNextDeparture(nearestDepartureTime(Sort(data.departure_times)));
        setDepartureTimes(groupDepartureTimes(data.departure_times));
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching route:', error);
        setLoading(false);
      });
  }, [lineId, stopId, routeId]);

  const groupDepartureTimes = (departureTimes: departureType[]) => {
    const groupedDepartureTimes: any[][] = [];
    for (let i = 0; i <= 24; i++) {
      groupedDepartureTimes.push([]);
    }
    departureTimes.forEach((time) => {
      const hour = parseInt(time.departure_time.split(':')[0]);
      groupedDepartureTimes[hour].push({
        departure_time: time.departure_time.split(':')[1],
        departure_id: time.departure_id,
      });
    });
    return groupedDepartureTimes;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  let condition = Number(
    timetable?.stops.find((obj) => obj.stop_id == stopId)?.stop_number
  );
  const selected = { backgroundColor: '#009788', color: 'white' };
  const fromHour = 4;
  const toHour = 23;

  return (
    <div className="LineStopTimetable">
      <div className="left">
        <h1>Rozkład jazdy linii {timetable?.line_name}</h1>
        <div className="lineType">{timetable?.line_type_name}</div>
        <div>
          <span className="bold">Przystanek</span>: {timetable?.stop_name}
        </div>
        <div>
          <span className="bold">Kierunek</span>: {timetable?.last_stop_name}
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
                      to={`/rozklad-jazdy-wedlug-linii/${line.line_name}/${stopId}/${line.route_number}`}
                    >
                      <div
                        className="otherLine nextDeparture"
                        key={line.line_name}
                      >
                        {line.line_name}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
        </div>
        <div>
          <span className="bold">Najbliższy odjazd</span>:{' '}
          {countdown && Number(countdown) > 0 ? (
            <>
              <Link
                className="nextDeparture"
                to={`/rozklad-jazdy-wedlug-linii/kurs/${nextDeparture?.departure_id}/${stopId}`}
              >
                {nextDeparture?.departure_time}
              </Link>
              {` (za ${countdown} minut)`}
            </>
          ) : (
            <>
              <Link
                className="nextDeparture"
                to={`/rozklad-jazdy-wedlug-linii/kurs/${nextDeparture?.departure_id}/${stopId}`}
              >
                {nextDeparture?.departure_time}
              </Link>{' '}
              (teraz)
            </>
          )}
        </div>
        <MiniRealTimeDepartures id={stopId!} />
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
                {Array.from({ length: toHour - fromHour + 1 }, (_, index) => (
                  <td key={index}>
                    <div>
                      {departureTimes[fromHour + index]?.map((time) => (
                        <Link
                          key={time.departure_id}
                          to={`/rozklad-jazdy-wedlug-linii/kurs/${time.departure_id}/${stopId}`}
                        >
                          <div
                            style={
                              (fromHour + index < 10
                                ? '0'.concat((fromHour + index).toString())
                                : fromHour + index
                              )
                                .toString()
                                .concat(':'.concat(time.departure_time)) ===
                              nextDeparture?.departure_time
                                ? { backgroundColor: '#FACF00' }
                                : {}
                            }
                          >
                            {time.departure_time}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        Operator: PKS Kamień Pomorski
      </div>
      <div className="right">
        <div>
          <Link
            to={`/rozklad-jazdy-wedlug-linii/${timetable?.line_name}/${timetable?.other_way_stop_id[0].id}/${timetable?.other_way_stop_id[0].route_number}`}
          >
            <button>
              <img src={returnIcon} width="20px"></img>
              <div>
                rozkład jazdy dla przeciwnego kierunku<div></div>
              </div>
            </button>
          </Link>
          <Link to={`/rozklad-jazdy-wedlug-linii/${timetable?.line_name}`}>
            <button>
              <img src={allIcon} width="20px"></img>
              <div>
                wszystkie trasy tej linii<div></div>
              </div>
            </button>
          </Link>
        </div>
        {timetable?.stops.map((stop, index) => (
          <div key={index}>
            <Link to={`/zespol-przystankowy/${stop.stop_id}`}>
              <div className="stopOther">
                <img width="75%" src={displayIcon} />
              </div>
            </Link>
            <div
              className="totalTravelTime"
              style={index + 1 >= condition ? selected : {}}
            >
              {index >= condition
                ? (travelTime = travelTime + Number(stop.travel_time))
                : ''}
            </div>
            <div
              className="travelTime"
              style={index + 1 == condition ? selected : {}}
            >
              {stop.travel_time}
            </div>
            <div
              className="stopName"
              style={index + 1 == condition ? selected : {}}
            >
              <Link
                style={index + 1 == condition ? selected : {}}
                to={`/rozklad-jazdy-wedlug-linii/${timetable.line_name}/${stop.stop_id}/${stop.route_number}`}
              >
                {stop.stop_name} {stop.is_on_request ? 'nż' : ''}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LineStopTimetable;
