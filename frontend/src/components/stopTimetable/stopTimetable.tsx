import './StopTimetable.css';
import service, { Stops } from '../../services/db';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
const StopTimetable = () => {
  const [stops, setStops] = useState<Stops>({});
  const [loading, setLoading] = useState<boolean>(false);
  useEffect(() => {
    setLoading(true);
    service.getAllStops().then((data) => {
      setStops(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="StopTimetable">
      {Object.keys(stops).map((letter) => (
        <>
          <h1>{letter}</h1>
          <div>
            {stops[letter].map((stop) => (
              <Link to={`/zespol-przystankowy/${stop.id}`}>
                {stop.stop_name}
              </Link>
            ))}
          </div>
        </>
      ))}
    </div>
  );
};

export default StopTimetable;
