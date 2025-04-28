import axios from 'axios';
import { ROUTES } from './config';

const baseURL = 'https://goleniowkm.pl/api';
const baseURL5 = 'http://localhost:3000/api';

export interface TransportLine {
  line_name: string;
  line_type_name: string;
}

export interface Stop {
  stop_id: number;
  stop_name: string;
  travel_time: number;
  is_on_request: boolean;
  route_number: number;
}

export interface StopsCategorized {
  [firstLetter: string]: {
    name: string;
    id: number;
  }[];
}

export interface LineTimetableData {
  line_color: string;
  line_name: string;
  line_type: string;
  true: Stop[];
  false: Stop[];
}

export interface DepartureTime {
  departure_times: { departure_time: string; departure_id: number }[];
  last_stop_name: string;
  line_name: string;
  line_type_name: string;
  line_type_color: string;
  other_way_stop_id: {
    id: number;
    route_number: number;
  }[];
  other_lines: otherLine[];
  stop_name: string;
  stops: TimetableStops[];
}

interface otherLine {
  line_name: string;
  line_type_color: string;
  route_number: string;
}

interface TimetableStops {
  stop_name: string;
  route_number: string;
  stop_number: string;
  travel_time: string;
  is_on_request: boolean;
  stop_id: string;
}

export interface TransportLinesGrouped {
  [lineType: string]: {
    [lineName: string]: { stop_name: string; stop_number: number }[];
  };
}
export interface StopGroupIf {
  [stopId: string]: {
    departure_id: number;
    departure_time: string;
    last_stop_name: string;
    line_name: string;
    route_number: number;
    stop_id: number;
    stop_name: string;
    total_travel_time: number;
  }[];
}

export interface Route {
  id: number;
  line_id: number;
  stop_id: number;
  route_number: number;
  travel_time: number;
  is_on_request: boolean;
  stop_name: string;
  departure_time: string;
}

export interface Timetable {
  id: number;
  route_number: number;
  departure_time: string;
}

export interface NewsInterface {
  id: number;
  title: string;
  content: string;
  created_at: Date;
}

export interface StopTimetable {
  departure_time: string;
  route_number: number;
  line_name: string;
  stop_name: string;
  last_stop_name: string;
  departure_text?: string;
}

const getLines = async (): Promise<TransportLinesGrouped> => {
  const response = await axios.get<TransportLinesGrouped>(ROUTES.HOME);
  return response.data;
};

const getLinesRoutes = async (): Promise<TransportLinesGrouped> => {
  const response = await axios.get<TransportLinesGrouped>(ROUTES.LINES);
  return response.data;
};

const getLineRoutes = async (id: any): Promise<TransportLinesGrouped> => {
  const response = await axios.get<TransportLinesGrouped>(
    ROUTES.LINE_ROUTES(id)
  );
  return response.data;
};

const getLineStop = async (
  routeId: any,
  stopNumber: any
): Promise<TransportLinesGrouped> => {
  const response = await axios.get<TransportLinesGrouped>(
    ROUTES.LINE_STOP_DEPARTURES(routeId, stopNumber)
  );
  return response.data;
};

const getNews = async (): Promise<NewsInterface[]> => {
  const response = await axios.get<TransportLinesGrouped>(ROUTES.NEWS);
  return response.data;
};

const getStopGroup = async (groupId: number): Promise<StopGroupIf> => {
  const response = await axios.get<StopGroupIf>(ROUTES.STOP_GROUP(groupId));
  return response.data;
};

const getStopDepartures = async (stopId) => {
  const response = await axios.get<StopGroupIf>(
    ROUTES.STOP_ALL_DEPARTURES(stopId)
  );
  return response.data;
};

const getRoute = async (lineId: number, departureId): Promise<StopGroupIf> => {
  const response = await axios.get<StopGroupIf>(
    ROUTES.ROUTE(lineId, departureId)
  );
  return response.data;
};

const getStops = async (): Promise<any> => {
  const response = await axios.get<any>(ROUTES.STOPS);
  return response.data;
};

export default {
  getLines,
  getStopGroup,
  getLineStop,
  getStops,
  getNews,
  getLineRoutes,
  getLinesRoutes,
  getRoute,
  getStopDepartures,
};
