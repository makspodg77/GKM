import './Stops.css';
import service, { StopsCategorized } from '../../services/db';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';

const Stops = () => {
  const [stops, setStops] = useState<StopsCategorized>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [filterSearch, setFilterSearch] = useState('');
  const [filteredStops, setFilteredStops] = useState<StopsCategorized>({});

  // Fetch stops data
  useEffect(() => {
    service.getStops().then((data) => {
      setStops(data);
      setFilteredStops(data); // Initialize filtered stops with all stops
      setLoading(false);
    });
  }, []);

  // Filter stops when search changes
  useEffect(() => {
    if (!Object.keys(stops).length) return;

    const searchLower = filterSearch.toLowerCase();

    // Create a new filtered object with the same structure
    const filtered: StopsCategorized = {};

    Object.keys(stops).forEach((letter) => {
      // Filter the stops array for this letter
      const filteredLetterStops = stops[letter].filter((stop) =>
        stop.name.toLowerCase().includes(searchLower)
      );

      // Only add this letter if it has matching stops
      if (filteredLetterStops.length > 0) {
        filtered[letter] = filteredLetterStops;
      }
    });

    setFilteredStops(filtered);
  }, [filterSearch, stops]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="StopTimetable">
      <h1>Rozkłady jazdy według przystanków</h1>
      <input
        className="search"
        placeholder="Szukaj przystanku..."
        value={filterSearch}
        onChange={(e) => setFilterSearch(e.target.value)}
      />

      {Object.keys(filteredStops).map((letter) => (
        <>
          <h1>{letter}</h1>
          <div>
            {filteredStops[letter].map((stop) => (
              <Link to={`/zespol-przystankowy/${stop.id}`}>{stop.name}</Link>
            ))}
          </div>
        </>
      ))}
    </div>
  );
};

export default Stops;
