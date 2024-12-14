import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import './App.css';
import Header from './components/header/Header';
import TransportLines from './components/transportLines/TransportLines';
import LinesTimeTable from './components/linesTimetable/LinesTimetable';
import LineTimetable from './components/lineTimetable/LineTimetable';
import LineStopTimetable from './components/lineStopTimetable/LineStopTimetable';
import RealTimeDepartures from './components/realTimeDepartures/RealTimeDepartures';
import StopGroup from './components/stopGroup/StopGroup';
import LineRoute from './components/lineRoute/LineRoute';

const PageStructure = (props: any) => {
  return (
    <>
      <Header />
      <div className="container">
        <section className="menu">
          Rozklady jazdy
          <ul>
            <li>
              <Link to="/rozklad-jazdy-wedlug-linii">
                Rozkłady jazdy według linii
              </Link>
            </li>
            <li>Rozkłady jazdy według przystanków</li>
          </ul>
          <Link to="/linie">Linie</Link>
          <div>Informacje</div>
          <div>Bilety i opłaty</div>
          <ul>
            <li>Bilety jednorazowe</li>
            <li>Bilety okresowe</li>
            <li>Ulgi i zwolnienia</li>
            <li>Bezpłatne przejazdy dla uczniów</li>
            <li>Opłaty dodatkowe</li>
          </ul>
          Szczeciński Bilet Metropolitalny
        </section>
        <section className="content">{props.children}</section>
      </div>
    </>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/tablica/:stopId" element={<RealTimeDepartures />} />
        <Route
          path="/"
          element={
            <PageStructure>
              <TransportLines />
            </PageStructure>
          }
        />
        <Route
          path="/linie"
          element={
            <PageStructure>
              <TransportLines />
            </PageStructure>
          }
        />
        <Route
          path="/rozklad-jazdy-wedlug-linii"
          element={
            <PageStructure>
              <LinesTimeTable />
            </PageStructure>
          }
        />
        <Route
          path="/rozklad-jazdy-wedlug-linii/:lineId"
          element={
            <PageStructure>
              <LineTimetable />
            </PageStructure>
          }
        />
        <Route
          path="/rozklad-jazdy-wedlug-linii/:lineId/:stopId/:routeId"
          element={
            <PageStructure>
              <LineStopTimetable />
            </PageStructure>
          }
        />
        <Route path="*" element={<>404 Nie znaleziono doris</>} />
        <Route
          path="/zespol-przystankowy/:stopId"
          element={
            <PageStructure>
              <StopGroup />
            </PageStructure>
          }
        />
        <Route
          path="/rozklad-jazdy-wedlug-linii/kurs/:timetableId/:stopId"
          element={
            <PageStructure>
              <LineRoute />
            </PageStructure>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
