import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import './App.css';
import { Suspense, lazy } from 'react';
import Header from './components/header/Header';
const TransportLines = lazy(
  () => import('./components/transportLines/TransportLines')
);
const Lines = lazy(() => import('./components/lines/Lines'));
const LineTimetable = lazy(
  () => import('./components/lineTimetable/LineTimetable')
);
const LineStopTimetable = lazy(
  () => import('./components/lineStopTimetable/LineStopTimetable')
);
const RealTimeDepartures = lazy(
  () => import('./components/realTimeDepartures/RealTimeDepartures')
);
const StopGroup = lazy(() => import('./components/stopGroup/StopGroup'));
const LineRoute = lazy(() => import('./components/lineRoute/LineRoute'));
const StopTimetable = lazy(() => import('./components/stops/Stops'));
const News = lazy(() => import('./components/news/News'));
import About from './components/about/About';
const Vehicles = lazy(() => import('./components/vehicles/Vehicles'));
import LoadingScreen from './components/common/loadingScreen/LoadingScreen';

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
        <nav className="menu" aria-label="Główne skróty serwisu">
          <h2>Rozkłady jazdy</h2>
          <div>
            <Link
              style={
                location == '/rozklad-jazdy-wedlug-linii' || location == '/'
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
          <div>
            <Link
              style={
                location == '/mapa-pojazdow-i-przystankow'
                  ? { backgroundColor: '#FACF00' }
                  : {}
              }
              to={`/mapa-pojazdow-i-przystankow`}
            >
              Mapa pojazdów i przystanków
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
              location == '/aktualnosci' ? { backgroundColor: '#FACF00' } : {}
            }
            to="/aktualnosci"
          >
            Aktualności
          </Link>
          <Link
            style={
              location == '/o-projekcie' ? { backgroundColor: '#FACF00' } : {}
            }
            to="/o-projekcie"
          >
            O projekcie
          </Link>
        </nav>
        <main className="content">{props.children}</main>
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
        <Route
          path="/tablica/:stopId"
          element={
            <Suspense fallback={<LoadingScreen />}>
              <RealTimeDepartures />
            </Suspense>
          }
        />
        <Route
          path="/"
          element={
            <PageStructure>
              <Suspense fallback={<LoadingScreen />}>
                <Lines />
              </Suspense>
            </PageStructure>
          }
        />
        <Route
          path="/linie"
          element={
            <PageStructure>
              <Suspense fallback={<LoadingScreen />}>
                <TransportLines />
              </Suspense>
            </PageStructure>
          }
        />
        <Route
          path="/rozklad-jazdy-wedlug-linii"
          element={
            <PageStructure>
              <Suspense fallback={<LoadingScreen />}>
                <Lines />
              </Suspense>
            </PageStructure>
          }
        />
        <Route
          path="/rozklad-jazdy-wedlug-linii/:lineId"
          element={
            <PageStructure>
              <Suspense fallback={<LoadingScreen />}>
                <LineTimetable />
              </Suspense>
            </PageStructure>
          }
        />
        <Route
          path="/rozklad-jazdy-wedlug-linii/:routeId/:stopNumber"
          element={
            <PageStructure>
              <Suspense fallback={<LoadingScreen />}>
                <LineStopTimetable />
              </Suspense>
            </PageStructure>
          }
        />
        <Route path="*" element={<>404 Nie znaleziono widoku</>} />
        <Route
          path="/zespol-przystankowy/:stopId"
          element={
            <PageStructure>
              <Suspense fallback={<LoadingScreen />}>
                <StopGroup />
              </Suspense>
            </PageStructure>
          }
        />
        <Route
          path="/rozklad-jazdy-wedlug-linii/kurs/:lineId/:timetableId/:stopNumber"
          element={
            <PageStructure>
              <Suspense fallback={<LoadingScreen />}>
                <LineRoute />
              </Suspense>
            </PageStructure>
          }
        />
        <Route
          path="/rozklady-jazdy/wedlug-przystankow"
          element={
            <PageStructure>
              <Suspense fallback={<LoadingScreen />}>
                <StopTimetable />
              </Suspense>
            </PageStructure>
          }
        />
        <Route
          path="/aktualnosci"
          element={
            <PageStructure>
              <Suspense fallback={<LoadingScreen />}>
                <News />
              </Suspense>
            </PageStructure>
          }
        />
        <Route
          path="/mapa-pojazdow-i-przystankow"
          element={
            <PageStructure>
              <Suspense fallback={<LoadingScreen />}>
                <Vehicles />
              </Suspense>
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
