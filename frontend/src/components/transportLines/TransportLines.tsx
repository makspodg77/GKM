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
    service.getTransportLines().then((data) => {
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
            {Object.keys(transportLines[lineType]).map((lineName: string) => (
              <div className="line-container" key={lineName}>
                <div>{lineName}</div>
                <div>
                  <span className="finalStops">
                    {transportLines[lineType][lineName].at(0)?.stop_name} ↔{' '}
                    {transportLines[lineType][lineName].at(-1)?.stop_name}
                  </span>
                  {transportLines[lineType][lineName].map((stopName) => (
                    <span key={stopName.stop_name}>
                      {stopName.stop_name}
                      {transportLines[lineType][lineName].at(-1) != stopName
                        ? ' - '
                        : ''}{' '}
                    </span>
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
