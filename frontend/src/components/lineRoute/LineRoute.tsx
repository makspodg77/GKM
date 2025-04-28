import './LineRoute.css';
import service from '../../services/db';
import { useEffect, useState } from 'react';
import arrowFart from '../../assets/tablica.png';
import { useParams, Link } from 'react-router-dom';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import onRequestIcon from '../../assets/on_request.png';

const LineRoute = () => {
  const { timetableId, lineId, stopNumber } = useParams<{
    timetableId: string;
    lineId: string;
    stopNumber: string | number;
  }>();

  const [lineName, setLineName] = useState<string>('');
  const [lineType, setLineType] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [route, setRoute] = useState<any>({});

  let iterator = 1;
  let flag = false;
  let sum = 0;

  useEffect(() => {
    setLoading(true);
    service.getRoute(lineId, timetableId).then((data) => {
      console.log(data);
      setRoute(data);
      setLoading(false);
    });
  }, [lineId, timetableId]);
  if (loading) return <LoadingScreen />;
  return (
    <div className="LineRoute">
      <h1>Przebieg kursu linii {route?.lineInfo?.name}</h1>
      <h3>
        {route.lineInfo?.name_singular}
        <div
          className="type-color"
          style={{ backgroundColor: route.lineInfo?.color }}
        ></div>
      </h3>

      <div className="routeContainer">
        {route?.stops?.map((stop: any) => {
          if (flag) {
            iterator++;
            sum += stop.travel_time;
          }
          if (stop.stop_number.toString() === stopNumber) {
            flag = true;
          }

          return (
            <div key={stop.stop_id}>
              <div>{flag ? iterator : ''}</div>
              <div>
                <Link
                  to={`/zespol-przystankowy/${stop.stop_group_id}`}
                  title="wszystkie linie zatrzymujące sie przy tym zespole przystankowym"
                >
                  <img src={arrowFart} width="100%" />
                </Link>
              </div>
              <div style={!flag ? { opacity: '0.5' } : {}}>
                <Link
                  to={`/rozklad-jazdy-wedlug-linii/${stop.route_id}/${stop.stop_number}`}
                >
                  {stop.name}{' '}
                  {stop.is_on_request ? (
                    <img src={onRequestIcon} title="Przystanek na żądanie" />
                  ) : (
                    ''
                  )}{' '}
                  ({stop.stop_group_id}/{stop.stop_id})
                </Link>
              </div>
              <div>
                {sum == 0
                  ? stopNumber == stop.stop_number
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
  );
};

export default LineRoute;
