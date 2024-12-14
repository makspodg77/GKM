import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import service, { StopTimetable } from '../../services/db';
import tabletIcon from '../../assets/tablet.png';
import fullscreenIcon from '../../assets/tablica2.png';
import './MiniRealTimeDepartures.css';

interface MiniRealTimeDeparturesInterface {
  id: string;
}

const MiniRealTimeDepartures = ({ id }: MiniRealTimeDeparturesInterface) => {
  const { stopId } = useParams<{ stopId: string }>();
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);
  const [departures, setDepartures] = useState<StopTimetable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [areRealTimeDeparturesOpened, setAreRealTimeDeparturesOpened] =
    useState<boolean>(false);
  useEffect(() => {
    setLoading(true);
    intervalsRef.current.forEach((interval) => clearInterval(interval));
    intervalsRef.current = [];

    service
      .getStopTimetable(Number(id ? id : stopId))
      .then((data) => {
        if (data) {
          data = data.slice(0, data.length - 1);
          setDepartures(FormatDepartureTime(Sort(data)));
        }
        setLoading(false);

        const updateCountdown = () => {
          setDepartures(FormatDepartureTime(Sort(data)));
        };
        const interval = setInterval(updateCountdown, 1000);
        intervalsRef.current.push(interval);
      })
      .catch((error) => {
        console.error('Error fetching stop timetable:', error);
        setLoading(false);
      });

    return () => {
      intervalsRef.current.forEach((interval) => clearInterval(interval));
      intervalsRef.current = [];
    };
  }, [stopId, id]);

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

  const FormatDepartureTime = (data: StopTimetable[]) => {
    const now = new Date();
    const time = new Date();
    let i = 0;
    data.forEach((departure) => {
      const [hours, minutes] = departure.departure_time.split(':').map(Number);
      time.setHours(hours, minutes);
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

  return (
    <div className="MiniRealTimeDepartures">
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <button
            onClick={() =>
              setAreRealTimeDeparturesOpened(!areRealTimeDeparturesOpened)
            }
          >
            <img width="20px" src={tabletIcon} />
            Rzeczywiste godziny odjazdów
          </button>
          {areRealTimeDeparturesOpened ? (
            <div className="realTimeDepartures">
              <div>
                {departures
                  .slice(0, departures.length > 6 ? 6 : departures.length)
                  .map((departure, index) => (
                    <div key={index}>
                      <div>{departure.line_name}</div>
                      <div>{departure.last_stop_name}</div>
                      <div>
                        {departure.departure_text
                          ? departure.departure_text
                          : departure.departure_time}
                      </div>
                    </div>
                  ))}
                <Link to={`/tablica/${id ? id : stopId}`}>
                  <img width="20px" src={fullscreenIcon} />
                </Link>
              </div>
            </div>
          ) : (
            <></>
          )}
        </>
      )}
    </div>
  );
};

export default MiniRealTimeDepartures;
