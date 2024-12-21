import './LineRoute.css';
import service from '../../services/db';
import { useEffect, useState } from 'react';
import arrowFart from '../../assets/tablica.png';
import { useParams, Link } from 'react-router-dom';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';

const LineRoute = () => {
  const { timetableId, stopId } = useParams<{
    timetableId: string;
    stopId: string;
  }>();

  const [lineName, setLineName] = useState<string>('');
  const [lineType, setLineType] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [route, setRoute] = useState<any>([]);

  let iterator = 1;
  let flag = false;
  let sum = 0;

  useEffect(() => {
    setLoading(true);
    service.getSpecificRoute(timetableId!.toString()).then((data) => {
      setLineName(data[0].line_name);
      setLineType(data[0].line_type_name);
      setRoute(data);
      console.log(data);
      setLoading(false);
    });
  }, [stopId, timetableId]);

  return (
    <>
      {!loading ? (
        <div className="LineRoute">
          <h1>Przebieg kursu linii {lineName}</h1>
          <h3>{lineType}</h3>

          <div className="routeContainer">
            {route.map((stop: any) => {
              if (flag) {
                iterator++;
                sum += stop.travel_time;
              }
              if (stop.stop_id.toString() === stopId) {
                flag = true;
              }

              return (
                <div key={stop.stop_id}>
                  <div>{flag ? iterator : ''}</div>
                  <div>
                    <Link to={`/zespol-przystankowy/${stop.stop_id}`}>
                      <img src={arrowFart} width="100%" />
                    </Link>
                  </div>
                  <div style={!flag ? { opacity: '0.5' } : {}}>
                    <Link
                      to={`/rozklad-jazdy-wedlug-linii/${stop.line_name}/${stop.stop_id}/${stop.route_number}`}
                    >
                      {stop.stop_name} ({stop.stop_id})
                    </Link>
                  </div>
                  <div>
                    {sum == 0
                      ? stopId == stop.stop_id
                        ? '↓'
                        : ''
                      : sum + ' min'}
                  </div>
                  <div>{stop.departure_time}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <LoadingScreen />
      )}
    </>
  );
};

export default LineRoute;
