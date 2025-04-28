import { useEffect, useState } from 'react';
import service from '../../services/db';
import { Link } from 'react-router-dom';
import { TransportLinesGrouped } from '../../services/db';
import './Lines.css';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';

const Lines = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [lines, setLines] = useState<TransportLinesGrouped>({});

  useEffect(() => {
    setLoading(true);
    service.getLines().then((data) => {
      setLines(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="LineTimetable">
      <h1>Rozklady jazdy według linii</h1>
      <ul>
        {Object.keys(lines)

          .map((lineType: any, index) => (
            <li key={lineType}>
              <h2>{lineType}</h2>
              <div className="line-container">
                {lines[lineType]
                  .sort((a, b) => a.name - b.name)
                  .map((lineName) => (
                    <Link
                      key={lineName.id}
                      to={`/rozklad-jazdy-wedlug-linii/${lineName.id}`}
                    >
                      <div>
                        <div
                          className="line"
                          style={{ backgroundColor: lineName.color }}
                        >
                          {lineName.name}
                        </div>
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

export default Lines;
