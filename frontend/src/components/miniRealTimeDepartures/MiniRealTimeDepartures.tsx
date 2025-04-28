import { useState } from 'react';
import { Link } from 'react-router-dom';
import tabletIcon from '../../assets/tablet.png';
import fullscreenIcon from '../../assets/tablica2.png';
import './MiniRealTimeDepartures.css';
import { useRealTimeDepartures } from '../../utils/departureUtils';

interface MiniRealTimeDeparturesInterface {
  id: string;
}

const MiniRealTimeDepartures = ({ id }: MiniRealTimeDeparturesInterface) => {
  const [areRealTimeDeparturesOpened, setAreRealTimeDeparturesOpened] =
    useState<boolean>(false);
  const { departures, loading } = useRealTimeDepartures(id);

  return (
    <div className="MiniRealTimeDepartures">
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <button
            onClick={() =>
              setAreRealTimeDeparturesOpened(!areRealTimeDeparturesOpened)
            }
          >
            <img width="20px" src={tabletIcon} alt="Tablet icon" />
            Rzeczywiste godziny odjazdów
          </button>
          {areRealTimeDeparturesOpened && (
            <div className="realTimeDepartures">
              <div>
                {departures
                  .slice(0, departures.length > 6 ? 6 : departures.length)
                  .map((departure, index) => (
                    <div
                      key={`${departure.line?.name || departure.line_name}-${departure.departure_time}-${index}`}
                    >
                      <div>{departure.line?.name || departure.line_name}</div>
                      <div>
                        {departure.last_stop || departure.last_stop_name}
                      </div>
                      <div>
                        {departure.departure_text === '>>>'
                          ? departure.departure_text
                          : departure.minutesUntil &&
                              departure.minutesUntil <= 30
                            ? departure.countdownText
                            : departure.formattedTime}
                      </div>
                    </div>
                  ))}
                <Link to={`/tablica/${id}`}>
                  <img
                    width="20px"
                    src={fullscreenIcon}
                    alt="Fullscreen icon"
                  />
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MiniRealTimeDepartures;
