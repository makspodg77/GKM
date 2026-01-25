const isDevelopment = import.meta.env.DEV;
export const API_BASE_URL = isDevelopment
  ? 'http://localhost:8080/api'
  : 'https://gkm.onrender.com/api';

export const ROUTES = {
  HOME: `${API_BASE_URL}/lines`,
  LINES: `${API_BASE_URL}/lines/all`,
  SINGULAR_REAL_LINE_MAP: (lineName: string) =>
    `${API_BASE_URL}/routes/map-route/${lineName}`,
  REAL_LINE_MAP: `${API_BASE_URL}/routes/anja`,
  ALL_ROUTES: `${API_BASE_URL}/routes/waypoints`,
  ACTIVE_BUSES_ONE_LINE: (lineId: string | number) =>
    `${API_BASE_URL}/routes/map-route/${lineId}/buses`,
  ALL_ROUTES_ONE_LINE: (lineId: string | number) =>
    `${API_BASE_URL}/routes/map-route/${lineId}`,
  NEWS: `${API_BASE_URL}/news`,
  LINE_ROUTES: (lineId: string | number) => `${API_BASE_URL}/routes/${lineId}`,
  ROUTE: (lineId: string | number, departureId: string | number) =>
    `${API_BASE_URL}/routes/route/${lineId}/${departureId}`,
  STOPS: `${API_BASE_URL}/stops`,
  STOP_GROUP: (id: string | number) =>
    `${API_BASE_URL}/stops/stop-groups/${id}`,
  ROUTE_DEPARTURES: (id: string | number) =>
    `${API_BASE_URL}/timetable/route/${id}`,
  LINE_STOP_DEPARTURES: (
    fullRouteId: string | number,
    stopNumber: string | number
  ) => `${API_BASE_URL}/timetable/departure-times/${fullRouteId}/${stopNumber}`,
  STOP_ALL_DEPARTURES: (stopId: string | number) =>
    `${API_BASE_URL}/timetable/${stopId}`,
  STOP_GROUP_ALL_DEPARTURES: (groupId: string | number) =>
    `${API_BASE_URL}/timetable/stop-group/${groupId}`,
};
