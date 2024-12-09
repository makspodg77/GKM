import { useEffect, useState } from 'react';
import './LineTimetable.css';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import service, { LineTimetableData, Stop } from '../../services/db';
import displayIcon from '../../assets/tablica.png';

const LineTimetable = () => {
    const { lineId } = useParams<{ lineId: string }>();
    const [line, setLine] = useState<LineTimetableData>({} as LineTimetableData);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (lineId) {
            setLoading(true);
            service.getRoute(lineId).then((data) => {
                setLine(data);
                setLoading(false);
            }).catch((error) => {
                console.error('Error fetching route:', error);
                setLoading(false);
            });
        }
    }, [lineId]);

    if (loading) {
        return <div>Loading...</div>;
    }
    return (
        <div className="LineTimetable">
            <h1>Linia {line.line_name}</h1>
            <h3>{line.line_type}</h3>
            <h2>Przebieg linii</h2>
            <div className="finalStops">{line && Array.isArray(line["true"]) ? String(line["true"][0].stop_name) : ""} ↔ {line && Array.isArray(line["true"]) ? String(line["true"][line["true"].length - 1].stop_name) : ""}</div>
            {line && Array.isArray(line["true"]) ? line["true"].map((stop, index) => (index !== line["true"].length - 1 ? stop.stop_name + " - " : stop.stop_name)) : ""}
            <h2>Przystanki linii</h2>
            <Route stops={line["true"]} lineId={lineId ? lineId : ""} />
            <Route stops={line["false"]} lineId={lineId ? lineId : ""} />
            <h2>Mapa</h2>
        </div>
    );
};

const Route = ({ stops, lineId }: { stops: Stop[], lineId: string }) => {
    return (
        <div className="Route"> 
        Kierunek: <span className="finalStop">{stops[stops.length - 1].stop_name}</span>
        <div className="routeContainer">
            {stops.map((stop, index) => (
                <>
                    <div className="routeStop" key={index}>
                        <Link style={{ textDecoration: 'none' }} to={`/zespol-przystankowy/${stop.stop_id}`}>
                            <div className="stopOther"><img width="50%" src={displayIcon} /></div>
                        </Link>
                        <div className="stopTime">
                            {stop.travel_time != 0 ? stop.travel_time : " " }
                        </div>
                        <Link style={{ textDecoration: 'none' }} to={`/rozklad-jazdy-wedlug-linii/${lineId}/${stop.stop_id}/${stop.route_number}`}>
                        <div className="stopName">
                            {stop.stop_name} {stop.is_on_request ? "nż" : ""}
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