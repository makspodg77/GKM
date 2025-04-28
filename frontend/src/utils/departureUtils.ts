import { useRef, useState, useEffect } from 'react';
import service from '../services/db';

export interface DepartureInfo {
  line_name?: string;
  line?: { name: string; color?: string };
  last_stop_name?: string;
  last_stop?: string;
  departure_time: string;
  departure_text?: string;
  isPast?: boolean;
  time?: Date;
  formattedTime?: string;
  minutesUntil?: number;
  countdownText?: string | null;
}

// Helper function to process time information
export const processTimeInfo = (timeString: string) => {
  const now = new Date();
  now.setSeconds(0, 0);
  const time = new Date();
  time.setSeconds(0, 0);
  const [hours, minutes] = timeString.split(':').map(Number);
  time.setHours(hours, minutes, 0, 0);

  // Check if departure just passed (within the last 2 minutes)
  const justPassedTime = new Date(now);
  justPassedTime.setMinutes(now.getMinutes() - 2); // Two minutes ago

  return {
    time: time,
    isPast: time < now,
    justPassed: time >= justPassedTime && time < now, // Time is between now and 2 minutes ago
    formattedTime: timeString,
  };
};

// Function to calculate minutes until departure
export const calculateMinutesToDeparture = (departureTime: string): number => {
  const now = new Date();
  const [hours, minutes] = departureTime.split(':').map(Number);
  const departure = new Date();
  departure.setHours(hours, minutes, 0, 0);

  // If departure is in the past (for the current day), it's tomorrow
  if (departure < now) {
    departure.setDate(departure.getDate() + 1);
  }

  // Calculate difference in minutes
  const diffMs = departure.getTime() - now.getTime();
  return Math.max(0, Math.round(diffMs / 60000)); // Return minutes, minimum 0
};

// Zmodyfikowana funkcja sortDepartures
export const sortDepartures = (data: any[]): any[] => {
  if (!Array.isArray(data)) {
    console.error('Sort function expected an array but received:', data);
    return [];
  }

  const now = new Date();

  return [...data].sort((a, b) => {
    // Extract hours and minutes
    const [hoursA, minutesA] = a.departure_time.split(':').map(Number);
    const [hoursB, minutesB] = b.departure_time.split(':').map(Number);

    // Create Date objects
    const timeA = new Date();
    timeA.setHours(hoursA, minutesA, 0, 0);

    const timeB = new Date();
    timeB.setHours(hoursB, minutesB, 0, 0);

    // Calculate time differences
    const diffA = timeA.getTime() - now.getTime();
    const diffB = timeB.getTime() - now.getTime();

    // If both are in the past or both are in the future, sort by time
    if ((diffA < 0 && diffB < 0) || (diffA >= 0 && diffB >= 0)) {
      return timeA.getTime() - timeB.getTime();
    }

    // If one is in the past and one is in the future, the future one comes first
    return diffB - diffA;
  });
};

// Zmodyfikowana funkcja processDepartures
export const processDepartures = (departuresArray: any[]): DepartureInfo[] => {
  if (!Array.isArray(departuresArray)) {
    console.error('Expected departures to be an array, got:', departuresArray);
    return [];
  }

  const now = new Date();

  return sortDepartures(departuresArray).map((dep) => {
    const timeInfo = processTimeInfo(dep.departure_time);
    const minutesUntil = calculateMinutesToDeparture(dep.departure_time);

    // Get departure time to compare with current time
    const [depHours, depMinutes] = dep.departure_time.split(':').map(Number);
    const depTime = new Date();
    depTime.setHours(depHours, depMinutes, 0, 0);

    // Calculate seconds until departure (negative if in the past)
    const secondsUntil = (depTime.getTime() - now.getTime()) / 1000;

    // Show ">>>" exactly 30 seconds before departure
    const isDeparting = secondsUntil >= 0 && secondsUntil <= 30;

    return {
      ...dep,
      ...timeInfo,
      minutesUntil,
      departure_text: isDeparting ? '>>>' : undefined,
      countdownText:
        minutesUntil > 0 && minutesUntil <= 30
          ? `za ${minutesUntil} min`
          : null,
      // We'll use isPast to determine sort order
      isPast: secondsUntil < 0,
    };
  });
};

// Zmodyfikowana funkcja useRealTimeDepartures
export const useRealTimeDepartures = (stopId: string | number | null) => {
  const [departures, setDepartures] = useState<DepartureInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [time, setTime] = useState<{ hours: string; minutes: string }>({
    hours: '00',
    minutes: '00',
  });
  const [stop, setStop] = useState<any>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const originalDeparturesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!stopId) {
      setLoading(false);
      return;
    }

    // Czyszczenie poprzednich interwałów
    if (intervalRef.current) clearInterval(intervalRef.current);

    setLoading(true);

    // Funkcja pobierająca dane
    const fetchData = () => {
      service
        .getStopDepartures(Number(stopId))
        .then((data) => {
          if (data?.departures?.length) {
            setStop(data.baseData || {});
            originalDeparturesRef.current = data.departures;

            // Przetwórz i posortuj odjazdy
            const processed = processDepartures(data.departures);
            setDepartures(processed);
          } else {
            setDepartures([]);
          }
          setLoading(false);
        })
        .catch(() => {
          setDepartures([]);
          setLoading(false);
        });
    };

    // Pobranie danych tylko raz
    fetchData();

    // Prosty interwał do aktualizacji czasu i odliczania
    intervalRef.current = setInterval(() => {
      const now = new Date();

      // Aktualizacja zegara
      setTime({
        hours: now.getHours().toString().padStart(2, '0'),
        minutes: now.getMinutes().toString().padStart(2, '0'),
      });

      // Aktualizacja stanu odjazdów - bez filtrowania!
      setDepartures((prev) => {
        // Aktualizuj wszystkie odjazdy
        const updated = prev.map((dep) => {
          const minutesUntil = calculateMinutesToDeparture(dep.departure_time);
          const [h, m] = dep.departure_time.split(':').map(Number);
          const depTime = new Date();
          depTime.setHours(h, m, 0, 0);

          // Oblicz sekundy do odjazdu
          const secondsUntil = (depTime.getTime() - now.getTime()) / 1000;

          // Pokaż ">>>" 30 sekund przed odjazdem
          const isDeparting = secondsUntil >= 0 && secondsUntil <= 30;

          return {
            ...dep,
            minutesUntil,
            departure_text: isDeparting ? '>>>' : undefined,
            countdownText:
              minutesUntil > 0 && minutesUntil <= 30
                ? `za ${minutesUntil} min`
                : null,
            // Oznacz czy odjazd jest w przeszłości (do sortowania)
            isPast: secondsUntil < 0,
          };
        });

        // Posortuj - przeszłe odjazdy na koniec listy
        return sortDepartures(updated);
      });

      // Sprawdź czy jest północ, aby pobrać nowy rozkład
      if (
        now.getHours() === 0 &&
        now.getMinutes() === 0 &&
        now.getSeconds() === 0
      ) {
        fetchData();
      }
    }, 1000);

    // Czyszczenie przy odmontowaniu
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [stopId]);

  return { departures, loading, currentTime: time, stop };
};
