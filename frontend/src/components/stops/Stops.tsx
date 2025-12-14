import './Stops.css';
import service, { Stop, StopLetterListing } from '../../services/db';
import { Link } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import debounce from 'lodash/debounce';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import PageTitle from '../common/pageTitle/PageTitle';

const Stops = () => {
  const [stops, setStops] = useState<StopLetterListing>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [filterSearch, setFilterSearch] = useState('');
  const [filteredStops, setFilteredStops] = useState<StopLetterListing>({});

  useEffect(() => {
    setLoading(true);
    service
      .getStops()
      .then((data: StopLetterListing) => {
        setStops(data);
        setFilteredStops(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load stops:', error);
        setLoading(false);
      });
  }, []);

  const debouncedFilter = useCallback(
    debounce((value: string) => {
      if (!Object.keys(stops).length) return;

      const searchLower = value.toLowerCase();
      const filtered: StopLetterListing = {};

      Object.keys(stops).forEach((letter) => {
        const filteredLetterStops = stops[letter].filter((stop) =>
          stop.name.toLowerCase().includes(searchLower)
        );

        if (filteredLetterStops.length > 0) {
          filtered[letter] = filteredLetterStops;
        }
      });

      setFilteredStops(filtered);
    }, 300),
    [stops]
  );

  useEffect(() => {
    debouncedFilter(filterSearch);
    return () => {
      debouncedFilter.cancel();
    };
  }, [filterSearch, debouncedFilter]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <section className="StopTimetable">
      <PageTitle title="Rozkłady jazdy według przystanków" />

      <div className="search-container">
        <input
          className="search"
          type="text"
          placeholder="Szukaj przystanku..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          aria-label="Szukaj przystanku"
        />
      </div>

      <div className="stop-groups">
        {Object.keys(filteredStops).map((letter: string) => (
          <div key={letter} className="stop-letter-group">
            <h2 id={`letter-${letter}`}>{letter}</h2>
            <div
              className="stop-links"
              role="list"
              aria-labelledby={`letter-${letter}`}
            >
              {filteredStops[letter].map((stop: Stop) => (
                <>
                  <Link
                    key={stop.id}
                    to={`/zespol-przystankowy/${stop.id}`}
                    className="stop-link"
                    role="listitem"
                  >
                    {stop.name}
                  </Link>
                </>
              ))}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(filteredStops).length === 0 && (
        <p className="no-stops">
          Brak przystanków spełniających kryteria wyszukiwania
        </p>
      )}
    </section>
  );
};

export default Stops;
