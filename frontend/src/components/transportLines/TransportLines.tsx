import './TransportLines.css';
import { useEffect, useState } from 'react';
import service, { RouteInfo } from '../../services/db';
import { TransportLinesGrouped } from '../../services/db';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import PageTitle from '../common/pageTitle/PageTitle';
import herbGoleniow from '../../assets/Herb-Goleniowa.png';
import herbNowogard from '../../assets/Herb-Nowogardu.png';
import herbMaszewo from '../../assets/Herb-Maszewa.png';
import herbOsina from '../../assets/Herb-Osiny.png';
import herbPrzybiernow from '../../assets/Herb-Przybiernowa.png';
import herbStepnica from '../../assets/Herb-Stepnicy.png';
const LineRoute: React.FC<{ route: RouteInfo }> = ({ route }) => (
  <div className="route-container">
    <div className="route-endpoints">
      {route.first_stop} ↔ {route.last_stop}
    </div>
    <p className="route-streets">
      {route.streets.map((stop) => `${stop.name} (${stop.street})`).join(' - ')}
    </p>
  </div>
);

const LineBadge = ({ name, color }: { name: string; color: string }) => (
  <div className="line-badge" style={{ background: color }}>
    {name}
  </div>
);

const TransportLines = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [transportLines, setTransportLines] = useState<TransportLinesGrouped>(
    {}
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    service
      .getLinesRoutes()
      .then((data: TransportLinesGrouped) => {
        console.log(data);
        setTransportLines(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load routes:', err);
        setError('Nie udało się załadować danych linii.');
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingScreen />;
  if (error) return <div className="error-message">{error}</div>;

  const municipalities = [
    { name: 'Goleniów', minNum: 10, maxNum: 99, emblem: herbGoleniow },
    { name: 'Maszewo', minNum: 200, maxNum: 299, emblem: herbMaszewo },
    { name: 'Nowogard', minNum: 100, maxNum: 199, emblem: herbNowogard },
    { name: 'Stepnica', minNum: 400, maxNum: 499, emblem: herbStepnica },
    { name: 'Przybiernów', minNum: 300, maxNum: 399, emblem: herbPrzybiernow },
    { name: 'Osina', minNum: 500, maxNum: 599, emblem: herbOsina },
  ];

  return (
    <div className="TransportLines">
      <PageTitle title="Linie komunikacji miejskiej" />
      <h2>Numeracja linii według gmin</h2>

      <div className="municipalities-grid">
        {municipalities
          .sort((a, b) => a.maxNum - b.maxNum)
          .map((municipality, index) => (
            <div className="municipality-container" key={municipality.name}>
              <div className="municipality-emblem">
                <img
                  src={municipality.emblem}
                  alt={`Herb gminy ${municipality.name}`}
                  height="50"
                />
              </div>
              <div className="municipality-info">
                <h4 className="municipality-name">Gmina {municipality.name}</h4>
                <div className="municipality-lines">
                  Linie: {municipality.minNum}-{municipality.maxNum}
                </div>
              </div>
            </div>
          ))}
      </div>

      <div className="line-categories">
        {Object.entries(transportLines).map(([lineType, lineTypeData]) => {
          if (!lineTypeData || Array.isArray(lineTypeData)) return null;

          const color = lineTypeData.color || '#056b89';

          return (
            <section key={lineType} className="line-category">
              <h2 id={`category-${lineType}`}>{lineType}</h2>

              <div
                className="line-list"
                role="list"
                aria-labelledby={`category-${lineType}`}
              >
                {Object.entries(lineTypeData)
                  .filter(([key]) => key !== 'color' && key !== 'routes')
                  .map(([lineName, routes]) => (
                    <article
                      key={lineName}
                      className="line-item"
                      role="listitem"
                    >
                      <LineBadge name={lineName} color={color} />

                      <div className="routes">
                        {Array.isArray(routes) &&
                          routes.map((route, idx) => (
                            <LineRoute
                              key={`${lineName}-${idx}`}
                              route={route}
                            />
                          ))}
                      </div>
                    </article>
                  ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default TransportLines;
