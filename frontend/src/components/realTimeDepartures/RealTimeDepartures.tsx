import './RealTimeDepartures.css';
import { useEffect, useState } from 'react';
import { StopTimetable } from '../../services/db';
import service from '../../services/db';
import { useParams } from 'react-router-dom';

const RealTimeDepartures = () => {
  const { stopId } = useParams<{ stopId: string }>();

  const [departures, setDepartures] = useState<StopTimetable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoursNow, setHoursNow] = useState<string>('00');
  const [minutesNow, setMinutesNow] = useState<string>('00');

  const [stopName, setStopName] = useState<string>('');

  const Sort = (data: StopTimetable[]) => {
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
    setLoading(true);
    service
      .getStopTimetable(Number(stopId))
      .then((data) => {
        if (data) {
          setStopName(data[data.length - 1][0].stop_name);
          data = data.slice(0, data.length - 1);
          const updateCountdown = () => {
            setDepartures(FormatDepartureTime(Sort(data)));
            const now = new Date();
            setHoursNow(now.getHours().toString());
            setMinutesNow(now.getMinutes().toString());
          };

          updateCountdown();

          const interval = setInterval(updateCountdown, 60000);
          setLoading(false);
          return () => clearInterval(interval);
        }
      })
      .catch((error) => {
        console.error('Error fetching stop timetable:', error);
        setLoading(false);
      });
  }, [stopId]);

  const FormatDepartureTime = (data: StopTimetable[]) => {
    const now = new Date();
    now.setSeconds(0, 0);
    const time = new Date();
    time.setSeconds(0, 0);
    let i = 0;
    data.forEach((departure) => {
      const [hours, minutes] = departure.departure_time.split(':').map(Number);
      time.setHours(hours, minutes, 0, 0);
      if (now > time) i++;
      else {
        if (time.getTime() - now.getTime() < 35 * 60000)
          departure.departure_text =
            'za ' +
            Math.floor((time.getTime() - now.getTime()) / 60000) +
            ' min';
        if (Math.floor((time.getTime() - now.getTime()) / 60000) < 1)
          departure.departure_text = '>>>';
      }

      return departure;
    });
    return data.slice(i);
  };

  const maximumAmountOfDeparturesShown = 7;

  return (
    <div className="RealTimeDepartures">
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="header">
            <h1></h1>
            <h1>
              {stopName} ({stopId})
            </h1>
            <h2>
              {hoursNow}:
              {Number(minutesNow) < 10 ? '0' + minutesNow : minutesNow}
            </h2>
          </div>
          <div>
            {departures
              .slice(
                0,
                departures.length > maximumAmountOfDeparturesShown
                  ? maximumAmountOfDeparturesShown
                  : departures.length
              )
              .map((departure, index) => (
                <div className="content" key={index}>
                  <div>{departure.line_name}</div>
                  <div>{departure.last_stop_name}</div>
                  <div>
                    {departure.departure_text
                      ? departure.departure_text
                      : departure.departure_time}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
};

export default RealTimeDepartures;
