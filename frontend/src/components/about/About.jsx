import PageTitle from '../common/pageTitle/PageTitle';
import './about.css';

const About = () => {
  return (
    <>
      <PageTitle title="O projekcie" />
      <p>
        Mieszkam w małej wsi Kliniska Wielkie, około 10 minut samochodem od
        obrzeży Szczecina. Poziom komunikacji w Szczecinie był i jest dla mnie
        imponujący. Zadałem sobie więc pytanie: co by było, gdyby miastem
        wojewódzkim był Goleniów zamiast Szczecina?
      </p>
      <p>
        Pomysł na projekt narodził się podczas mojego treningu w grudniu 2023
        roku, kiedy zacząłem się zastanawiać: co bym wprowadził, gdybym miał
        taką możliwość? Po wielu iteracjach i pomysłach zaprojektowałem linię,
        którą motywują moje osobiste odczucia, ale ma w sobie też ziarnko
        prawdy, ponieważ ma bardzo dużo wspólnego z goleniowską gminną linią 9.
        Była to linia 95 (która istnieje do dziś, w nieco zmienionej formie). W
        mojej wizji miała kursować między Kliniska Rzemieślnicza (pętlą łączącą
        sołectwa tej części gminy) a ulicą Wolińską przy Kauflandzie w
        Goleniowie. Numer linii miałby duchowo łączyć ją z komunikacją miejską w
        Szczecinie, w której akurat w tamtym okresie tego numeru brakowało (dziś
        linia 95 łączy szpital przy Unii Lubelskiej z Osiedlem Zawadzkiego).
      </p>
      <p>
        Ta pierwsza wizja zainspirowała mnie do dalszych dygresji. Od tamtego
        czasu poznałem historię komunikacji miejskiej Szczecina, Świnoujścia i
        Goleniowa. Zgłębiłem także temat transportu kolejowego. Dzięki dokładnym
        analizom zrozumiałem, jak te miasta zarządzają swoimi sieciami
        transportowymi. Połączyłem istniejącą infrastrukturę z tą, która
        istniała w przeszłości, oraz z tą, która kiedyś mogłaby powstać.
      </p>
      <p>
        Chciałem, aby aplikacja tworzyła jak najrzetelniejsze uczucie imersji,
        tak jakby wszystkie kursy naprawdę miały miejsce. Z tego powodu
        stworzyłem wiele widoków mających za zadanie replikować elementy świata
        rzeczywistego, takie jak elektroniczne tablice informacji pasażerskiej
        na przystankach czy rzeczywiste lokalizacje pojazdów.
      </p>
      <p>
        Interfejs użytkownika wzorowałem na stronie ZDiTM Szczecin, ponieważ
        jestem z nią najlepiej zaznajomiony i uważam ją za bardzo intuicyjną.
        Strona, na której teraz jesteś, to już druga wersja aplikacji — posiada
        więcej funkcjonalności, takich jak: linie okrężne, linie nocne,
        przystanki opcjonalne, podgląd trasy linii, podgląd lokalizacji
        przystanku i wiele innych.
      </p>
      <p>
        Dla użytkownika końcowego dostępna jest część prezentująca rozkłady i
        mapy, natomiast od strony „backendu” stworzyłem panel zarządzania siecią
        komunikacji miejskiej. Pozwala on na dodawanie nowych typów linii,
        zespołów przystankowych, przystanków i połączeń.
        <p>
          Panel zarządzania, do którego możesz przejść{' '}
          <a
            href="https://github.com/makspodg77/gkm-admin2.0"
            target="_blank"
            rel="noopener noreferrer"
          >
            tutaj
          </a>
          , także istnieje w dwóch wersjach — nowsza umożliwia bardziej
          zaawansowane i wygodne wprowadzanie danych.
        </p>
      </p>
      <p>
        Obecnie strona komunikacjagoleniow.pl (wcześniej goleniowkm.pl) działa w
        oparciu o dane wprowadzone właśnie przez ten panel.
      </p>
      <strong>Moje plany na przyszłość dla projektu:</strong>
      <ol>
        <li>dalszy rozwój siatki komunikacyjnej powiatu</li>
        <li>długotrwałe wsparcie techniczne</li>
        <li>
          przypisanie brygady do linii i kursu (a może nawet pracowników?)
        </li>
        <li className="finished">symulacja systemu lokalizacji GPS</li>
        <li>symulacja funkcjonalności zajezdni</li>
        <li>wydarzenia losowe (awarie pojazdów, opóźnienia, odwołane kursy)</li>
      </ol>
      <h4>
        Proces tworzenia był dla mnie samą przyjemnością i mam nadzieję, że
        korzystanie z niej jest równie przyjemne. 💕🐱
      </h4>
      <h4>Strony, na które warto zajrzeć:</h4>
      <ul>
        <li>
          <a href="https://www.bazakolejowa.pl/index.php">
            www.bazakolejowa.pl
          </a>
        </li>
        <li>
          <a href="https://www.mkm.szczecin.pl/">www.mkm.szczecin.pl</a>
        </li>
        <li>
          <a href="https://www.zditm.szczecin.pl/pl/pasazer/informacje">
            www.zditm.szczecin.pl
          </a>
        </li>
      </ul>
      <h4>A teraz trochę więcej informacji technicznych…</h4>
      <p>
        Obie aplikacje zostały zbudowane w technologii <strong>React</strong> po
        stronie frontendu oraz <strong>Node.js</strong> na backendzie. W
        projekcie korzystam z darmowych hostingów baz danych{' '}
        <strong>Postgres</strong> (wcześniej SQL Server), które przechowują
        wszystkie informacje o liniach, przystankach i rozkładach jazdy.
      </p>
      <p>
        Cały system został zaprojektowany tak, aby jak najwięcej informacji było
        generowanych automatycznie — bez ręcznego wpisywania odjazdów z każdego
        przystanku. Godziny odjazdów są automatycznie obliczane na podstawie
        wyjazdu brygady z pętli, z uwzględnieniem czasu przejazdu pomiędzy
        kolejnymi przystankami. Dzięki temu rozkłady są zawsze aktualne i
        dokładne, nawet w przypadku zmian w sieci połączeń.
      </p>
      <p>
        Zarządzanie całą stroną jest możliwe dzięki rozbudowanemu panelowi
        administratora. Pozwala on na szybkie i wygodne dodawanie nowych typów
        linii, linii, przystanków oraz rozkładów jazdy — wszystko bez
        konieczności edytowania kodu źródłowego.
        <strong>
          Każda zmiana wprowadzona w panelu jest natychmiast widoczna
        </strong>{' '}
        na stronie użytkownika, co gwarantuje płynne i bezproblemowe
        aktualizowanie danych.
      </p>
      <p>
        Projekt został zaprojektowany z myślą o prostocie użytkowania oraz
        elastyczności rozwoju w przyszłości. Zarówno interfejs użytkownika, jak
        i panel administracyjny są responsywne i dostosowane do urządzeń
        mobilnych, co pozwala zarządzać stroną oraz przeglądać rozkłady
        praktycznie z każdego miejsca.
      </p>
      <p>
        Cały system działa w oparciu o nowoczesne technologie webowe i został
        stworzony z myślą o łatwej rozbudowie oraz długoterminowym utrzymaniu.
      </p>
      <h4>Link do wszystkich linii naniesionych na jedną mapę:</h4>
      <a href="https://metrodreamin.com/view/c1gyRGRtbXEyQmh4MzV3emhTZnV0dDIyQldYMnww">
        mapa na metrodreamin'
      </a>
      <h4>Struktura bazy danych</h4>
      <p>
        Poniżej możesz zobaczyć schemat struktury bazy danych używanej w
        projekcie GKM — pokazuje on relacje między liniami, przystankami oraz
        kursami. Dzięki odpowiedniemu rozplanowaniu danych mogłem stworzyć
        wydajny i skalowalny system.
      </p>
      <iframe
        width="100%"
        height="500px"
        style={{
          boxShadow: '0 2px 8px 0 rgba(63,69,81,0.16)',
          borderRadius: '15px',
        }}
        allowTransparency="true"
        allowFullScreen="true"
        scrolling="no"
        title="Embedded DrawSQL IFrame"
        frameBorder="0"
        src="https://drawsql.app/teams/gkm/diagrams/gkm/embed"
      ></iframe>
      <h4>Chcesz zobaczyć kod źródłowy lub się ze mną skontaktować?</h4>
      <ul>
        <li>
          <strong>GitHub projektu:</strong>{' '}
          <a
            href="https://github.com/makspodg77/GKM"
            target="_blank"
            rel="noopener noreferrer"
          >
            GKM na GitHub
          </a>
        </li>
        <li>
          <strong>E-mail:</strong>{' '}
          <a href="mailto:makspodg77@gmail.com">makspodg77@gmail.com</a>
        </li>
      </ul>
    </>
  );
};

export default About;
