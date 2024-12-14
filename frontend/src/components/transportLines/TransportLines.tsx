import './TransportLines.css';
import { useEffect, useState } from 'react';
import service from '../../services/db';
import { TransportLinesGrouped } from '../../services/db';

const TransportLines = () => {
  const [transportLines, setTransportLines] = useState<TransportLinesGrouped>(
    {}
  );

  useEffect(() => {
    service.getTransportLines().then((data) => setTransportLines(data));
  }, []);

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
                    {transportLines[lineType][lineName].at(0)} ↔{' '}
                    {transportLines[lineType][lineName].at(-1)}
                  </span>
                  {transportLines[lineType][lineName].map((stopName) => (
                    <span key={stopName}>
                      {stopName}
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
