export const API_BASE_URL6 = 'http://localhost:8080/api';
export const API_BASE_URL = 'https://goleniowkm.pl/api';
export const ROUTES = {
  HOME: `${API_BASE_URL}/lines`,
  LINES: `${API_BASE_URL}/lines/all`,
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
