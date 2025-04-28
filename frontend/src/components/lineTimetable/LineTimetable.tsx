import { useEffect, useState } from 'react';
import './LineTimetable.css';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import service, { LineTimetableData, Stop } from '../../services/db';
import displayIcon from '../../assets/tablica.png';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import MapRouteDisplay from '../mapDisplay/MapRouteDisplay'; // Import the new component
import firstIcon from '../../assets/first.png';
import optionalIcon from '../../assets/optional.png';
import lastIcon from '../../assets/last.png';
import onRequestIcon from '../../assets/on_request.png';

const LineTimetable = () => {
  const { lineId } = useParams<{ lineId: string }>();
  const [line, setLine] = useState<LineTimetableData>({} as LineTimetableData);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (lineId) {
      setLoading(true);
      service
        .getLineRoutes(lineId)
        .then((data) => {
          setLine(data);
          console.log(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching route:', error);
          setLoading(false);
        });
    }
  }, [lineId]);

  if (loading) {
    return <LoadingScreen />;
  }
  return (
    <div className="LineTimetable">
      <h1>Linia {line[0].line.name}</h1>
      <h3>
        <div
          className="type-color"
          style={{ backgroundColor: line[0].line.color }}
        ></div>
        {line[0].line.name_singular}
      </h3>
      <h2>Przebieg linii</h2>
      {line[0].linePath.map((path) => (
        <>
          <div className="finalStops">
            {path.first_stop}
            {'  '}↔{'  '}
            {path.last_stop}
          </div>
          {path.streets.map((street, index) =>
            index !== path.streets.length - 1 ? street + ' - ' : street
          )}
        </>
      ))}

      <h2>Przystanki linii</h2>
      {line.map((path) => (
        <Route stops={path.stops} lineId={lineId ? lineId : ''} />
      ))}

      <h2>Mapa</h2>

      <MapRouteDisplay
        routes={line.map((path) => path.stops)}
        colors={[line[0].line.color || '#e74c3c']}
      />
    </div>
  );
};

const Route = ({ stops, lineId }: { stops: Stop[]; lineId: string }) => {
  return (
    <div className="Route">
      Kierunek:{' '}
      <span className="finalStop">{stops[stops.length - 1].name}</span>
      <div className="routeContainer">
        {stops.map((stop, index) => (
          <>
            <div className="routeStop" key={index}>
              <Link
                style={{ textDecoration: 'none' }}
                title="wszystkie linie zatrzymujące sie przy tym zespole przystankowym"
                to={`/zespol-przystankowy/${stop.group_id}`}
              >
                <div className="stopOther">
                  <img width="50%" src={displayIcon} />
                </div>
              </Link>
              <div className="stopTime">
                {!stop.is_first && !stop.is_optional ? stop.travel_time : ' '}
              </div>
              <Link
                style={{ textDecoration: 'none' }}
                to={`/rozklad-jazdy-wedlug-linii/${stop.route_id}/${stop.stop_number}`}
              >
                <div className="stopName">
                  <div
                    className={
                      stop.is_first
                        ? 'first-stop'
                        : stop.is_last
                          ? 'last-stop'
                          : ''
                    }
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
                    {stop.name}{' '}
                  </div>
                  {stop.is_on_request ? (
                    <img src={onRequestIcon} title="Przystanek na żądanie" />
                  ) : (
                    ''
                  )}
                </div>
              </Link>
            </div>
          </>
        ))}
      </div>
    </div>
  );
};

export default LineTimetable;
