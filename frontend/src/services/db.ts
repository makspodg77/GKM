import axios from 'axios';

const baseURL = 'https://gkm.fly.dev/api';

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

export interface Stops {
  [firstLetter: string]: {
    stop_name: string;
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
    [lineName: string]: string[];
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

const getTransportLines = async (): Promise<TransportLinesGrouped> => {
  const response = await axios.get<TransportLinesGrouped>(
    `${baseURL}/transportLines`
  );
  return response.data;
};

const getTransportLinesForStop = async (
  stopId: number,
  lineId: number
): Promise<TransportLine[]> => {
  const response = await axios.get<TransportLine[]>(
    `${baseURL}/transportLines/transportStop?stopId=${stopId}&lineId=${lineId}`
  );
  return response.data;
};

const getRoutes = async (
  lineNr: number,
  direction: number
): Promise<Route[]> => {
  const response = await axios.get<Route[]>(
    `${baseURL}/routes/route?lineNr=${lineNr}&direction=${direction}`
  );
  return response.data;
};

const getRoute = async (id: string): Promise<LineTimetableData> => {
  const response = await axios.get<LineTimetableData>(
    `${baseURL}/routes/lineRoute/${id}`
  );
  return response.data;
};

const getSpecificRoute = async (departure_id: string): Promise<any> => {
  const response = await axios.get<any>(
    `${baseURL}/routes/specificRouteTimetable/${departure_id}`
  );
  return response.data;
};

const getTimetable = async (stopId: number): Promise<Timetable[]> => {
  const response = await axios.get<Timetable[]>(
    `${baseURL}/timetable/timetable?stopId=${stopId}`
  );
  return response.data;
};

const getNews = async (): Promise<NewsInterface[]> => {
  const response = await axios.get<NewsInterface[]>(`${baseURL}/news`);
  return response.data.map((item: any) => ({
    ...item,
    created_at: new Date(item.created_at),
  }));
};

const getDepartureTimes = async (
  stopId: string,
  routeNumber: string
): Promise<DepartureTime> => {
  const response = await axios.get<DepartureTime>(
    `${baseURL}/timetable/departure-times?stop_id=${stopId}&route_number=${routeNumber}`
  );
  console.log(response.data);
  return response.data;
};

const getStopTimetable = async (
  stopId: number
): Promise<StopTimetable[] | any[]> => {
  const response = await axios.get<StopTimetable[]>(
    `${baseURL}/timetable/timetable?stopId=${stopId}`
  );
  return response.data;
};

const getStopGroup = async (stopId: number): Promise<StopGroupIf> => {
  const response = await axios.get<StopGroupIf>(
    `${baseURL}/timetable/stop-group?stopId=${stopId}`
  );
  return response.data;
};

const getAllStops = async (): Promise<any> => {
  const response = await axios.get<any>(`${baseURL}/transportStops`);
  return response.data;
};

export default {
  getSpecificRoute,
  getTransportLines,
  getStopGroup,
  getTransportLinesForStop,
  getRoutes,
  getRoute,
  getTimetable,
  getDepartureTimes,
  getStopTimetable,
  getAllStops,
  getNews,
};
