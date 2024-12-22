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
import { useState } from 'react';
import StopTimetable from './components/stopTimetable/stopTimetable';
import News from './components/news/News';

const PageStructure = (props: any) => {
  const getPathAfterHost = () => {
    const url = window.location.href;
    const path = new URL(url).pathname;
    return path;
  };

  const location = '/' + getPathAfterHost().split('/')[1];
  return (
    <>
      <Header />
      <div className="container">
        <section className="menu">
          Rozklady jazdy
          <div>
            <Link
              style={
                location == '/rozklad-jazdy-wedlug-linii'
                  ? { backgroundColor: '#FACF00' }
                  : {}
              }
              to="/rozklad-jazdy-wedlug-linii"
            >
              Rozkłady jazdy według linii
            </Link>
          </div>
          <div>
            <Link
              style={
                location == `/rozklady-jazdy` ||
                location == '/zespol-przystankowy'
                  ? { backgroundColor: '#FACF00' }
                  : {}
              }
              to={`/rozklady-jazdy/wedlug-przystankow`}
            >
              Rozkłady jazdy według przystanków
            </Link>
          </div>
          <Link
            style={location == '/linie' ? { backgroundColor: '#FACF00' } : {}}
            to="/linie"
          >
            Linie
          </Link>
          <Link
            style={
              location == '/informacje' || location == '/'
                ? { backgroundColor: '#FACF00' }
                : {}
            }
            to="/informacje"
          >
            Informacje
          </Link>
        </section>
        <section className="content">{props.children}</section>
      </div>
      <footer>
        <div>© 2024 Maksymilian Podgórski</div>
      </footer>
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
              <News />
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
        <Route
          path="/rozklady-jazdy/wedlug-przystankow"
          element={
            <PageStructure>
              <StopTimetable />
            </PageStructure>
          }
        />
        <Route
          path="/informacje"
          element={
            <PageStructure>
              <News />
            </PageStructure>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
