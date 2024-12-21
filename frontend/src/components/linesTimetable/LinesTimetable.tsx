import { useEffect, useState } from 'react';
import service from '../../services/db';
import { Link } from 'react-router-dom';
import { TransportLinesGrouped } from '../../services/db';
import './LinesTimetable.css';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';

const LinesTimeTable = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [lines, setLines] = useState<TransportLinesGrouped>({});

  useEffect(() => {
    setLoading(true);
    service.getTransportLines().then((data) => {
      setLines(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="LineTimetable">
      <h1>Rozklady jazdy według linii</h1>
      <ul>
        {Object.keys(lines).map((lineType) => (
          <li key={lineType}>
            <h2>{lineType}</h2>
            <div className="line-container">
              {Object.keys(lines[lineType]).map((lineName) => (
                <Link to={`/rozklad-jazdy-wedlug-linii/${lineName}`}>
                  <div key={lineName}>
                    <div className="line">{lineName}</div>
                  </div>
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LinesTimeTable;
