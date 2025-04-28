import axios from 'axios';
import { ROUTES } from './config';

export interface Stop {
  is_on_request: any;
  stop_number: any;
  route_id: any;
  travel_time: number;
  is_last: any;
  is_optional: any;
  is_first: any;
  group_id: string;
  id: string;
  name: string;
}

export interface StopLetterListing {
  [letter: string]: Stop[];
}

export interface LineInfo {
  id: number;
  name: string;
  color: string;
}

export interface RouteInfo {
  first_stop: string;
  last_stop: string;
  streets: string[];
}

export interface LineDetailCategory {
  color?: string;
  routes?: {
    [lineNumber: string]: RouteInfo[];
  };
}

export interface DepartureTime {
  line: {
    name: string;
    name_singular: string;
    name_plural: string;
    color: string;
    id: number;
  };
  departures: {
    [hour: string]: {
      departure_time: string;
      signature: string;
      color: string;
      timetable_id: string;
      route_id: string;
    }[];
  };
  signatures: {
    color: string;
    signature: string;
    signature_explanation: string | null;
  }[];
  stops: {
    stop_group_id: string;
    street: string;
    stop_id: string;
    travel_time: number;
    stop_number: number;
    name: string;
    is_on_request: boolean;
    map: string;
    is_optional: boolean;
    is_first: boolean;
    is_last: boolean;
    route_id: string;
  }[];
  stop: {
    stop_group_id: string;
    street: string;
    stop_id: string;
    travel_time: number;
    stop_number: number;
    name: string;
    is_on_request: boolean;
    map: string;
    is_optional: boolean;
    is_first: boolean;
    is_last: boolean;
    route_id: string;
  };
  other_lines: {
    color: string;
    name: string;
    stop_number: string;
    route_id: string;
  }[];
  last_stops: string[];
}

export interface LineCategoryListing {
  [categoryName: string]: LineInfo[];
}

export interface TransportLinesGrouped {
  [categoryName: string]: LineDetailCategory | LineInfo[] | undefined;
}

export interface Inews {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export interface StopData {
  stop: {
    stop_id: number;
    group_id: number;
    group_name: string;
    street: string;
    map?: string;
  };
  departures: DepartureData[];
}

export interface DepartureData {
  departure_time: string;
  last_stop: string;
  line: {
    name: string;
    color: string;
  };
  route_id: number;
  stop_number: number;
}

const getLines = async (): Promise<LineCategoryListing> => {
  const response = await axios.get<LineCategoryListing>(ROUTES.HOME);
  return response.data;
};

const getLinesRoutes = async (): Promise<TransportLinesGrouped> => {
  const response = await axios.get<TransportLinesGrouped>(ROUTES.LINES);
  return response.data;
};

const getLineRoutes = async (id: number): Promise<LineDetailCategory> => {
  const response = await axios.get<LineDetailCategory>(ROUTES.LINE_ROUTES(id));
  return response.data;
};

const getLineStop = async (
  routeId: any,
  stopNumber: any
): Promise<DepartureTime> => {
  const response = await axios.get<DepartureTime>(
    ROUTES.LINE_STOP_DEPARTURES(routeId, stopNumber)
  );
  return response.data;
};

const getNews = async (): Promise<Inews[]> => {
  const response = await axios.get<Inews[]>(ROUTES.NEWS);
  return response.data;
};

const getStopGroup = async (groupId: number): Promise<StopData> => {
  const response = await axios.get<StopData>(ROUTES.STOP_GROUP(groupId));
  return response.data;
};

const getStopDepartures = async (stopId: number) => {
  const response = await axios.get<any>(ROUTES.STOP_ALL_DEPARTURES(stopId));
  return response.data;
};

const getRoute = async (lineId: number, departureId: number): Promise<any> => {
  const response = await axios.get<any>(ROUTES.ROUTE(lineId, departureId));
  return response.data;
};

const getStops = async (): Promise<StopLetterListing> => {
  const response = await axios.get<StopLetterListing>(ROUTES.STOPS);
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
