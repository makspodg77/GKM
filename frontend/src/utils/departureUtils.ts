const ONE_DAY_MS = 86400000; // 24h w milisekundach
const ONE_MINUTE_MS = 60000; // 1 minuta w milisekundach
const TWO_MINUTES_MS = 120000; // 2 minuty w milisekundach

import { useRef, useState, useEffect, useCallback } from 'react';
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

export const processTimeInfo = (timeString: string) => {
  const now = new Date();
  now.setSeconds(0, 0);

  const [hours, minutes] = timeString.split(':').map(Number);
  const time = new Date();
  time.setHours(hours, minutes, 0, 0);

  const diffMs = time.getTime() - now.getTime();
  const justPassedTime = now.getTime() - TWO_MINUTES_MS;

  return {
    time,
    isPast: diffMs < 0,
    justPassed: time.getTime() >= justPassedTime && diffMs < 0,
    formattedTime: timeString,
  };
};

export const calculateMinutesToDeparture = (departureTime: string): number => {
  const now = new Date();
  const [hours, minutes] = departureTime.split(':').map(Number);

  let timestamp = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes
  ).getTime();

  if (timestamp < now.getTime()) {
    timestamp += ONE_DAY_MS;
  }

  return Math.max(0, Math.round((timestamp - now.getTime()) / ONE_MINUTE_MS));
};

export const sortDepartures = (data: any[]): any[] => {
  if (!Array.isArray(data)) {
    console.error('Sort function expected an array but received:', data);
    return [];
  }

  const now = new Date().getTime();

  return [...data].sort((a, b) => {
    const [hoursA, minutesA] = a.departure_time.split(':').map(Number);
    const [hoursB, minutesB] = b.departure_time.split(':').map(Number);

    const timestampA = new Date().setHours(hoursA, minutesA, 0, 0);
    const timestampB = new Date().setHours(hoursB, minutesB, 0, 0);

    let diffA = timestampA - now;
    let diffB = timestampB - now;

    if (diffA < 0) diffA += ONE_DAY_MS;
    if (diffB < 0) diffB += ONE_DAY_MS;

    return diffA - diffB;
  });
};

export const processDepartures = (departuresArray: any[]): DepartureInfo[] => {
  if (!Array.isArray(departuresArray)) {
    console.error('Expected departures to be an array, got:', departuresArray);
    return [];
  }

  const now = new Date();

  return sortDepartures(departuresArray).map((dep) => {
    const timeInfo = processTimeInfo(dep.departure_time);
    const minutesUntil = calculateMinutesToDeparture(dep.departure_time);

    const [depHours, depMinutes] = dep.departure_time.split(':').map(Number);
    const depTime = new Date();
    depTime.setHours(depHours, depMinutes, 0, 0);

    const secondsUntil = (depTime.getTime() - now.getTime()) / 1000;

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
      isPast: secondsUntil < 0,
    };
  });
};

export const useRealTimeDepartures = (stopId: string | number | null) => {
  const [departures, setDepartures] = useState<DepartureInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [time, setTime] = useState<{ hours: string; minutes: string }>(() => {
    const now = new Date();
    return {
      hours: now.getHours().toString().padStart(2, '0'),
      minutes: now.getMinutes().toString().padStart(2, '0'),
    };
  });
  const [stop, setStop] = useState<any>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const originalDeparturesRef = useRef<any[]>([]);

  const updateDepartures = useCallback(() => {
    const now = new Date();
    const currentTime = {
      hours: now.getHours().toString().padStart(2, '0'),
      minutes: now.getMinutes().toString().padStart(2, '0'),
    };

    setTime(currentTime);

    setDepartures((prevDepartures) => {
      if (prevDepartures.length === 0) return prevDepartures;

      const updated = prevDepartures.map((dep) => {
        const minutesUntil = calculateMinutesToDeparture(dep.departure_time);
        const [h, m] = dep.departure_time.split(':').map(Number);

        const depTimestamp = new Date().setHours(h, m, 0, 0);
        const secondsUntil = (depTimestamp - now.getTime()) / 1000;
        const isDeparting = secondsUntil >= 0 && secondsUntil <= 30;

        return {
          ...dep,
          minutesUntil,
          departure_text: isDeparting ? '>>>' : undefined,
          countdownText:
            minutesUntil > 0 && minutesUntil <= 30
              ? `za ${minutesUntil} min`
              : null,
          isPast: secondsUntil < 0,
        };
      });

      return sortDepartures(updated);
    });
  }, []);

  const fetchData = useCallback(() => {
    if (!stopId) return;

    setLoading(true);
    service
      .getStopDepartures(Number(stopId))
      .then((data) => {
        if (data?.departures?.length) {
          setStop(data.baseData || {});
          originalDeparturesRef.current = data.departures;
          setDepartures(processDepartures(data.departures));
        } else {
          setDepartures([]);
        }
      })
      .catch(() => {
        setDepartures([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [stopId]);

  useEffect(() => {
    if (!stopId) {
      setLoading(false);
      return;
    }

    if (intervalRef.current) clearInterval(intervalRef.current);

    fetchData();

    intervalRef.current = setInterval(() => {
      updateDepartures();

      const now = new Date();
      if (
        now.getHours() === 0 &&
        now.getMinutes() === 0 &&
        now.getSeconds() < 2
      ) {
        fetchData();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [stopId, fetchData, updateDepartures]);

  return { departures, loading, currentTime: time, stop };
};
