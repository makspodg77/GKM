import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import './App.css';
import Header from './components/header/Header';
import TransportLines from './components/transportLines/TransportLines';
import Lines from './components/lines/Lines';
import LineTimetable from './components/lineTimetable/LineTimetable';
import LineStopTimetable from './components/lineStopTimetable/LineStopTimetable';
import RealTimeDepartures from './components/realTimeDepartures/RealTimeDepartures';
import StopGroup from './components/stopGroup/StopGroup';
import LineRoute from './components/lineRoute/LineRoute';
import { useState } from 'react';
import StopTimetable from './components/stops/Stops';
import News from './components/news/News';
import About from './components/about/About';

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
              location == '/aktualnosci' || location == '/'
                ? { backgroundColor: '#FACF00' }
                : {}
            }
            to="/aktualnosci"
          >
            Aktualności
          </Link>
          <Link
            style={
              location == '/o-projekcie' || location == '/'
                ? { backgroundColor: '#FACF00' }
                : {}
            }
            to="/o-projekcie"
          >
            O projekcie
          </Link>
        </section>
        <section className="content">{props.children}</section>
      </div>
      <footer>
        <div>
          <p>ⓒ Maksymilian Podgórski. Wszystkie prawa zastrzeżone.</p>
          <p>
            Projekt komunikacji miejskiej, układ linii, rozkład jazdy oraz
            aplikacja są dziełem fikcyjnym i zostały stworzone wyłącznie w
            celach kreatywnych.
          </p>
          <p>
            Wszelkie nazwy, trasy i dane przedstawione w aplikacji są wymyślone
            i nie mają odzwierciedlenia w rzeczywistości.{' '}
          </p>
          <p>
            Zabrania się kopiowania, rozpowszechniania i wykorzystywania
            materiałów bez pisemnej zgody autora. Niniejsze dzieło jest
            chronione prawem autorskim zgodnie z ustawą o prawie autorskim i
            prawach pokrewnych.
          </p>
        </div>
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
              <Lines />
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
          path="/rozklad-jazdy-wedlug-linii/:routeId/:stopNumber"
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
          path="/rozklad-jazdy-wedlug-linii/kurs/:lineId/:timetableId/:stopNumber"
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
          path="/aktualnosci"
          element={
            <PageStructure>
              <News />
            </PageStructure>
          }
        />
        <Route
          path="/o-projekcie"
          element={
            <PageStructure>
              <About />
            </PageStructure>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
