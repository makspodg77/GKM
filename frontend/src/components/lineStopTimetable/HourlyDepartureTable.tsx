import { Link } from 'react-router-dom';
import { DepartureTime } from '../../services/db';

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
        ...Array.from({ length: 23 - fromHour + 1 }, (_, i) => fromHour + i),
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

export default HourlyDepartureTable;
