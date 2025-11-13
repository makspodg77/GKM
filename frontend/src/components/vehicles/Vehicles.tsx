import { useEffect, useState, useMemo } from 'react';
import service from '../../services/db';
import MapRouteDisplay from '../mapDisplay/MapRouteDisplay';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import './Vehicles.css';
import PageTitle from '../common/pageTitle/PageTitle';
import busIcon from '../../assets/bus.svg';
import refreshIcon from '../../assets/refresh.svg';

const Vehicles = () => {
  const [data, setData] = useState<any>(null);
  const [routes, setRoutes] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [stops, setStops] = useState([]);
  useEffect(() => {
    let isMounted = true;
    const fetchRoutes = async () => {
      try {
        const data = await service.getAllRoutes();
        if (isMounted) {
          setRoutes(data.routes);
          const standardizedStops = data.stops.map((stop: any) => {
            let lat = null,
              lon = null;
            let parts = stop.map.trim().split(/[ ,]+/);
            if (parts.length === 2) {
              let n1 = parseFloat(parts[1]);
              let n2 = parseFloat(parts[0]);
              if (Math.abs(n1) > 90 && Math.abs(n2) <= 90) {
                lon = n1;
                lat = n2;
              } else {
                lat = n1;
                lon = n2;
              }
            }
            return { ...stop, lat, lon };
          });
          setStops(standardizedStops);
        }
      } catch (error) {
        console.error('Error fetching routes:', error);
      }
    };
    fetchRoutes();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!routes || routes.length === 0) return;
    setLoading(true);
    setSeconds(0);
    let isMounted = true;
    let interval: NodeJS.Timeout;

    const fetchData = async () => {
      setSeconds(0);
      try {
        const result = await service.getEveryRouteMap();
        if (isMounted) setData(result);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    interval = setInterval(fetchData, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [routes]);

  useEffect(() => {
    const addSecond = () => {
      setSeconds((prevSeconds) => prevSeconds + 1);
    };

    const interval = setInterval(addSecond, 1000);
    return () => clearInterval(interval);
  }, []);

  const mapData = useMemo(() => {
    if (!data?.vehicles) {
      return { activeBuses: [], routes2: [] };
    }

    const routes2 = routes.map((vehicle: any) => vehicle.map_routes || []);

    let formattedStops = [];
    if (data.stops) {
      if (Array.isArray(data.stops) && data.stops.length > 0) {
        if (Array.isArray(data.stops[0])) {
          formattedStops = data.stops;
        } else {
          formattedStops = [data.stops];
        }
      }
    }

    return {
      activeBuses: data.vehicles,
      routes: routes2,
      stops: formattedStops,
    };
  }, [data]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!data?.vehicles || data.vehicles.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Brak aktywnych pojazdów</h2>
        <p>Obecnie nie ma żadnych pojazdów w trasie.</p>
      </div>
    );
  }

  return (
    <div className="Vehicles">
      <PageTitle title="Mapa pojazdów i przystanków"></PageTitle>

      <div className="container">
        <MapRouteDisplay
          activeBuses={mapData.activeBuses}
          routes={mapData.routes}
          fitBounds={true}
          stops={stops}
        ></MapRouteDisplay>

        <div className="info">
          <div>
            <div>
              <img
                className="bus-icon"
                src={busIcon}
                alt="icon"
                style={{
                  width: '24px',
                  height: '24px',
                  verticalAlign: 'middle',
                }}
              />
            </div>
            {data.vehicles.length}
          </div>
          <div>
            <div>
              <img
                className="bus-icon"
                src={refreshIcon}
                alt="icon"
                style={{
                  width: '24px',
                  height: '24px',
                  verticalAlign: 'middle',
                }}
              />
            </div>{' '}
            {seconds}s temu
          </div>
        </div>
      </div>
    </div>
  );
};

export default Vehicles;
