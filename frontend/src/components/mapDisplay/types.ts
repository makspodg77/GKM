export interface RouteCoordinate {
  departure_route_id: number;
  id: number;
  lat: number;
  lon: number;
  stop_nearby: boolean;
  stop_number: number;
}

export interface Stop {
  id: number;
  name: string;
  lat: number;
  lon: number;
}
