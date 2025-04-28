import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import tabletIcon from '../../assets/tablet.png';
import fullscreenIcon from '../../assets/tablica2.png';
import './MiniRealTimeDepartures.css';
import { useRealTimeDepartures } from '../../utils/departureUtils';

// Add more specific types for the departure data
interface Departure {
  line?: {
    name: string;
    color?: string;
  } | null;
  line_name?: string;
  last_stop?: string;
  last_stop_name?: string;
  departure_time: string;
  departure_text?: string;
  minutesUntil?: number;
  countdownText?: string | null;
  formattedTime?: string;
}

// Use string | number for id since it could be either
interface MiniRealTimeDeparturesProps {
  id: string | number;
}

const DepartureItem: React.FC<{ departure: Departure; index: number }> = ({
  departure,
  index,
}) => (
  <div
    key={`${departure.line?.name || departure.line_name}-${departure.departure_time}-${index}`}
    className="departure-item"
  >
    <div className="line-name">
      {departure.line?.name || departure.line_name}
    </div>
    <div className="destination">
      {departure.last_stop || departure.last_stop_name}
    </div>
    <div className="time">
      {departure.departure_text === '>>>' ? (
        <span className="arriving-now">{departure.departure_text}</span>
      ) : departure.minutesUntil && departure.minutesUntil <= 30 ? (
        <span>{departure.countdownText}</span>
      ) : (
        <span>{departure.formattedTime}</span>
      )}
    </div>
  </div>
);

const MiniRealTimeDepartures: React.FC<MiniRealTimeDeparturesProps> = memo(
  ({ id }) => {
    const [areRealTimeDeparturesOpened, setAreRealTimeDeparturesOpened] =
      useState<boolean>(false);
    const { departures, loading } = useRealTimeDepartures(id);

    return (
      <div className="MiniRealTimeDepartures">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span>Ładowanie rzeczywistych odjazdów...</span>
          </div>
        ) : (
          <>
            <button
              onClick={() =>
                setAreRealTimeDeparturesOpened(!areRealTimeDeparturesOpened)
              }
              className={`toggle-button ${areRealTimeDeparturesOpened ? 'active' : ''}`}
            >
              <img
                width="20"
                height="20"
                src={tabletIcon}
                alt=""
                className="button-icon"
              />
              <span>
                {areRealTimeDeparturesOpened
                  ? 'Schowaj rzeczywiste odjazdy'
                  : 'Rzeczywiste godziny odjazdów'}
              </span>
            </button>

            {areRealTimeDeparturesOpened && (
              <div
                id="real-time-departures"
                className="realTimeDepartures"
                aria-live="polite"
              >
                {!loading && departures.length === 0 && (
                  <div className="no-departures">
                    Brak najbliższych odjazdów z tego przystanku
                  </div>
                )}

                {!loading && departures.length > 0 && (
                  <div>
                    {departures
                      .slice(0, Math.min(departures.length, 6))
                      .map((departure, index) => (
                        <DepartureItem
                          key={index}
                          departure={departure}
                          index={index}
                        />
                      ))}
                    <Link to={`/tablica/${id}`}>
                      <img
                        width="20px"
                        src={fullscreenIcon}
                        alt="Fullscreen icon"
                      />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }
);

export default MiniRealTimeDepartures;
