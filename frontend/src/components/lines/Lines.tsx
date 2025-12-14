import { useEffect, useMemo, useState } from 'react';
import service, { LineCategoryListing, LineInfo } from '../../services/db';
import { Link } from 'react-router-dom';
import './Lines.css';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import PageTitle from '../common/pageTitle/PageTitle';
import { usePageMetadata } from '../../utils/usePageMetadata';

const Lines = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [lines, setLines] = useState<LineCategoryListing>({});

  useEffect(() => {
    setLoading(true);
    service
      .getLines()
      .then((data: LineCategoryListing) => {
        setLines(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load lines:', error);
        setLoading(false);
      });
  }, []);

  const hasLines = Object.values(lines).some((array) => array.length > 0);

  const featuredLines = useMemo(() => {
    const flattened = Object.values(lines).flat();
    return flattened.slice(0, 6).map((lineItem) => lineItem.name);
  }, [lines]);

  usePageMetadata({
    title:
      'Rozkłady jazdy linii autobusowych – Goleniowska Komunikacja Miejska',
    description: `Wybierz linię autobusową, aby zobaczyć szczegółowy rozkład jazdy. Popularne linie: ${
      featuredLines.length > 0
        ? featuredLines.join(', ')
        : 'linie dzienne i nocne GKM'
    }.`,
  });

  if (loading) return <LoadingScreen />;

  return (
    <div className="LineTimetable">
      <PageTitle title="Rozkłady jazdy według linii" />
      {hasLines ? (
        <section className="LineTimetable">
          {Object.entries(lines).map(
            ([lineType, lineInfoArray]: [string, LineInfo[]]) => (
              <div key={lineType} className="line-category">
                <h2 id={`category-${lineType}`}>{lineType}</h2>
                <ul
                  className="line-container"
                  role="list"
                  aria-labelledby={`category-${lineType}`}
                >
                  {lineInfoArray.map((line: LineInfo) => (
                    <li key={line.id} className="line-wrapper" role="listitem">
                      <Link
                        to={`/rozklad-jazdy-wedlug-linii/${line.id}`}
                        className="line-link"
                        aria-label={`Linia ${line.name}`}
                      >
                        <div
                          className="line"
                          style={{ borderTop: `${line.color} 3px solid` }}
                        >
                          {line.name}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </section>
      ) : (
        <div className="no-lines">Brak dostępnych linii</div>
      )}
    </div>
  );
};

export default Lines;
