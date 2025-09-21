import { useEffect, useState } from 'react';
import service, { LineCategoryListing, LineInfo } from '../../services/db';
import { Link } from 'react-router-dom';
import './Lines.css';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import PageTitle from '../common/pageTitle/PageTitle';

const Lines = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [lines, setLines] = useState<LineCategoryListing>({});

  useEffect(() => {
    setLoading(true);
    service
      .getLines()
      .then((data: LineCategoryListing) => {
        const sortedLines: LineCategoryListing = {};
        Object.entries(data).forEach(([category, lines]) => {
          sortedLines[category] = [...lines].sort((a, b) => {
            const aIsNumber = !isNaN(Number(a.name));
            const bIsNumber = !isNaN(Number(b.name));

            if (aIsNumber && bIsNumber) {
              return Number(a.name) - Number(b.name);
            }

            if (!aIsNumber && !bIsNumber) {
              return a.name.localeCompare(b.name);
            }

            if (aIsNumber && !bIsNumber) {
              return -1;
            }

            if (!aIsNumber && bIsNumber) {
              return 1;
            }

            return 0;
          });
        });
        setLines(sortedLines);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load lines:', error);
        setLoading(false);
      });
  }, []);

  const hasLines = Object.values(lines).some((array) => array.length > 0);

  if (loading) return <LoadingScreen />;

  return (
    <div className="LineTimetable">
      <PageTitle title="Rozkłady jazdy według linii" />
      {hasLines ? (
        <section className="LineTimetable">
          {Object.entries(lines)
            .sort(([lineTypeA], [lineTypeB]) => {
              const lineTypeALower = lineTypeA.toLowerCase();
              const lineTypeBLower = lineTypeB.toLowerCase();

              const isDzienneA = lineTypeALower.includes('dzienne');
              const isNocneA = lineTypeALower.includes('nocne');
              const isDzienneB = lineTypeBLower.includes('dzienne');
              const isNocneB = lineTypeBLower.includes('nocne');

              if (isDzienneA && isNocneB) return -1;
              if (isNocneA && isDzienneB) return 1;

              return lineTypeA.localeCompare(lineTypeB, 'pl', {
                numeric: true,
                sensitivity: 'base',
              });
            })
            .map(([lineType, lineInfoArray]: [string, LineInfo[]]) => (
              <div key={lineType} className="line-category">
                <h2 id={`category-${lineType}`}>{lineType}</h2>
                <div
                  className="line-container"
                  role="list"
                  aria-labelledby={`category-${lineType}`}
                >
                  {lineInfoArray.map((line: LineInfo) => (
                    <Link
                      key={line.id}
                      to={`/rozklad-jazdy-wedlug-linii/${line.id}`}
                      className="line-link"
                      aria-label={`Line ${line.name}`}
                    >
                      <div className="line-wrapper" role="listitem">
                        <div
                          className="line"
                          style={{ borderTop: `${line.color} 3px solid` }}
                        >
                          {line.name}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </section>
      ) : (
        <div className="no-lines">Brak dostępnych linii</div>
      )}
    </div>
  );
};

export default Lines;
