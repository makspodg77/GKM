import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import service, { StopGroupIf } from '../../services/db';
import MiniRealTimeDepartures from '../miniRealTimeDepartures/MiniRealTimeDepartures';
import './StopGroup.css';

const StopGroup = () => {
    const { stopId } = useParams<{ stopId: string }>();
    const [stopGroupF, setStopGroup] = useState<StopGroupIf>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [skipped, setSkipped] = useState<boolean>(true);
    const [stopName, setStopName] = useState<string>("");
    const [stopIds, setStopIds] = useState<string[]>([]);

    const FormatDepartureTime = (data: string) => {
        const now = new Date();
        now.setSeconds(0, 0);
        const time = new Date();
        time.setSeconds(0, 0);
        const [hours, minutes] = data.split(':').map(Number);
        time.setHours(hours, minutes, 0, 0);
        if (now > time) return false;
        if(skipped == true) setSkipped(false);
        return true;
    };

    const updateCountdown = () => {
        if (!stopGroupF) return;
        let updatedStopGroup: StopGroupIf = {};
        for (const key in stopGroupF) {
            updatedStopGroup[key] = Sort(stopGroupF[key]);
        }
        setStopGroup(updatedStopGroup);
    };

    const Sort = (data: any) => {
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
        setIsLoading(true);
        service.getStopGroup(Number(stopId)).then((data: StopGroupIf) => {
            let updatedStopGroup: StopGroupIf = {};
            for (const key in data) {
                updatedStopGroup[key] = Sort(data[key]);
            }
            setStopGroup(updatedStopGroup);
            setStopName(data[Object.keys(data)[0]][0]?.stop_name);
            setStopIds(Object.keys(data).map(key => key));
            setIsLoading(false);
        }).catch((error) => {
            console.error('Error fetching stop group:', error);
            setIsLoading(false);
        });
    }, [stopId]);

    useEffect(() => {
        const interval = setInterval(updateCountdown, 60000);
        return () => clearInterval(interval); 
    }, [stopGroupF]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <>
        {!isLoading ? (
            <div className="StopGroup">
                <h1>Zespół przystankowy "{stopName}"</h1>
                {Object.keys(stopGroupF).map((key, index) => (
                    <div key={key} className="stop">
                        <div className="map"></div>
                        <h3>Przystanek nr {stopIds[index]}</h3>
                        <MiniRealTimeDepartures id={stopIds[index]} />
                        <h3>Najbliższe odjazdy według rozkładu jazdy:</h3>
                        <div>
                            {stopGroupF[key].map(element => (FormatDepartureTime(element.departure_time) ? (
                                <div className="route">
                                    <div>{element.line_name}</div>
                                    <div><Link to={`/rozklad-jazdy-wedlug-linii/${element.line_name}/${element.stop_id}/${element.route_number}`}>{element.last_stop_name}</Link></div>
                                    <div>{element.departure_time}</div>
                                </div>
                            ) : '') 
                            
                            )}
                            {skipped ? (<div>Z tego przystanku obecnie nie są wykonywane żadne kursy.</div>): ''}
                        </div>
                    </div>
                ))}
            </div>
        ) : 'Loading...'}
        
        </>
    )
}

export default StopGroup;