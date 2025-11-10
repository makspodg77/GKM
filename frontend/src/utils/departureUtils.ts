import { useRef, useState, useEffect, useCallback } from 'react';
import service from '../services/db';

const ONE_DAY_MS = 86400000;
const ONE_MINUTE_MS = 60000;

export interface DepartureInfo {
  departure_time: string;
  last_stop?: string;
  departure_text?: string | null;
  alias?: string | null;
  line_name?: string;
  route_id?: string | number;
  stop_number?: string | number;
  name?: string;
  line?: {
    name?: string;
    color?: string;
    custom_headsign?: string;
  };
}

const calculateMinutesToDeparture = (departureTime: string): number => {
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

const sortDepartures = (data: any[]): any[] => {
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

const processDepartures = (departuresArray: any[]): DepartureInfo[] => {
  if (!Array.isArray(departuresArray)) {
    console.error('Expected departures to be an array, got:', departuresArray);
    return [];
  }

  const now = new Date();

  return sortDepartures(departuresArray).map((dep) => {
    const minutesUntil = calculateMinutesToDeparture(dep.departure_time);

    const [depHours, depMinutes] = dep.departure_time.split(':').map(Number);
    const depTime = new Date();
    depTime.setHours(depHours, depMinutes, 0, 0);

    const secondsUntil = (depTime.getTime() - now.getTime()) / 1000;

    const isDeparting = secondsUntil >= 0 && secondsUntil <= 30;

    return {
      ...dep,
      departure_text: isDeparting
        ? '>>>'
        : minutesUntil > 0 && minutesUntil <= 30
          ? `za ${minutesUntil} min`
          : null,
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
      return processDepartures(prevDepartures);
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

    intervalRef.current = setInterval(() => updateDepartures(), 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [stopId, fetchData, updateDepartures]);

  return { departures, loading, currentTime: time, stop };
};
