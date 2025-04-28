import './TransportLines.css';
import { useEffect, useState } from 'react';
import service from '../../services/db';
import { TransportLinesGrouped } from '../../services/db';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';

const TransportLines = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [transportLines, setTransportLines] = useState<TransportLinesGrouped>(
    {}
  );

  useEffect(() => {
    setLoading(true);
    service.getLinesRoutes().then((data) => {
      console.log(data);
      setTransportLines(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="TransportLines">
      <h1>Linie komunikacji miejskiej</h1>
      <ul>
        {Object.keys(transportLines).map((lineType: string) => (
          <li key={lineType}>
            <h2>{lineType}</h2>
            {Object.keys(transportLines[lineType])
              .filter((line) => Array.isArray(transportLines[lineType][line]))
              .map((lineName: string) => (
                <div className="line-container" key={lineName}>
                  <div style={{ background: transportLines[lineType].color }}>
                    {lineName}
                  </div>
                  <div>
                    {transportLines[lineType][lineName].map((line) => (
                      <>
                        <span className="finalStops">
                          {line.first_stop} ↔ {line.last_stop}
                        </span>
                        {line.streets.map((stopName) => (
                          <span key={stopName}>
                            {stopName}
                            {line.streets.at(-1) != stopName ? ' - ' : ''}{' '}
                          </span>
                        ))}
                      </>
                    ))}
                  </div>
                </div>
              ))}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TransportLines;
