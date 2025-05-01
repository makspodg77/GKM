import PageTitle from '../common/pageTitle/PageTitle';

const About = () => {
  return (
    <>
      <PageTitle title="O projekcie" />
      <p>
        Mieszkam w małej wsi o nazwie Kliniska Wielkie, około 10 minut
        samochodem od obrzeży Szczecina. Jeśli chciałem dostać się do Szczecina
        czymś innym niż pociągiem, miałem dwie opcje: albo iść pieszo, albo
        skorzystać z autobusu gminnego, który dojeżdża do najbliższego
        przystanku ZDiTM… dwa razy dziennie. Zawsze zdumiewała mnie ta przepaść
        w komforcie podróżowania między jednym powiatem a drugim.
      </p>
      <p>
        Pomysł na projekt narodził się podczas treningu w grudniu 2023 roku,
        kiedy zacząłem się zastanawiać: "Co bym zmienił lub dodał, gdybym miał
        taką możliwość?" Po kilku dniach planowania wybrałem linię, która – choć
        idealnie odpowiadała moim potrzebom – mogłaby być także ważnym środkiem
        transportu w całej gminie i powiecie. Była to linia 95 (która istnieje
        do dziś, w nieco zmienionej formie). W mojej wizji miała kursować między
        Kliniskami Rzemieślniczą (głównym węzłem przesiadkowym rejonu) a ulicą
        Wolińską przy Kauflandzie w Goleniowie.
      </p>
      <p>
        Ta pierwsza wizja zainspirowała mnie do dalszych dygresji. Od tamtego
        czasu poznałem historię komunikacji miejskiej Szczecina, Świnoujścia i
        Goleniowa – w przypadku Szczecina nawet poszczególnych linii i pętli.
        Zgłębiłem także temat transportu kolejowego. Dzięki dokładnym analizom
        zrozumiałem, jak te miasta zarządzają swoimi sieciami transportowymi.
        Połączyłem istniejącą infrastrukturę z tą, która istniała w przeszłości,
        oraz z tą, która mogłaby powstać w przyszłości.
      </p>
      <p>
        Chciałem, aby użytkownicy mojej aplikacji mieli wrażenie, że to wszystko
        naprawdę się dzieje — że "żyje". Dlatego stworzyłem symulację
        realistycznych odjazdów, zwłaszcza tam, gdzie kursuje kilka linii —
        efekt jest bardzo przekonujący.
      </p>
      <p>
        Interfejs użytkownika wzorowałem na stronie ZDiTM Szczecin, ponieważ
        jestem z nią najlepiej zaznajomiony i uważam ją za bardzo intuicyjną.
        Strona, na której teraz jesteś, to już druga wersja aplikacji — posiada
        więcej funkcjonalności, takich jak: linie okrężne, linie nocne,
        przystanki opcjonalne, podgląd trasy linii, podgląd lokalizacji
        przystanku i wiele innych.
      </p>{' '}
      <p>
        Dla użytkownika końcowego dostępna jest część prezentująca rozkłady i
        mapy, natomiast od strony "backendu" stworzyłem panel zarządzania siecią
        komunikacji miejskiej. Pozwala on na dodawanie nowych typów linii,
        zespołów przystankowych, przystanków i połączeń.{' '}
        <p>
          Panel zarządzania, do którego możesz przejść
          {'  '}{' '}
          <a href="LINK_DO_PANELU" target="_blank" rel="noopener noreferrer">
            tutaj
          </a>
          , także istnieje w dwóch wersjach — nowsza umożliwia bardziej
          zaawansowane i wygodne wprowadzanie danych.
        </p>
      </p>{' '}
      <p>
        Obecnie strona goleniowkm.pl działa w oparciu o dane wprowadzone przez
        właśnie ten panel.
      </p>
      <strong>Moje plany na przyszłość dla projektu?</strong>
      <ol>
        <li>dalszy rozwój siatki komunikacyjnej powiatu</li>
        <li>długotrwałe wsparcie techniczne</li>
        <li>przpisanie brygady do linii i kursu (może i nawet pracowników?)</li>
        <li>symulacja systemu lokalizacji gps</li>
        <li>symulacja funkcjonalności zajezdni</li>
        <li>wydarzenia losowe (awaria pojazdu, opóźnienia, odwołane kursy)</li>
      </ol>
      <h4>
        Mam nadzieję, że korzystanie ze strony będzie dla Ciebie tak przyjemne,
        jak dla mnie było jej tworzenie 💖
      </h4>
      <h4>Strony na które warto zajrzeć: </h4>
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
      <h4>A teraz trochę więcej informacji technicznych...</h4>
      <p>
        Obie aplikacje zostały zbudowane w technologii <strong>React</strong> po
        stronie frontendu oraz <strong>Node.js</strong> na backendzie. W
        projekcie korzystam z darmowych hostingów baz danych{' '}
        <strong>SQL Server</strong>, które przechowują wszystkie informacje o
        liniach, przystankach, brygadach i rozkładach jazdy.
      </p>
      <p>
        Cały system został zaprojektowany tak, aby odjazdy autobusów generowały
        się <strong>dynamicznie</strong> — bez ręcznego wpisywania każdego
        kursu. Godziny odjazdów są automatycznie obliczane na podstawie wyjazdu
        brygady z pętli, uwzględniając czas przejazdu pomiędzy kolejnymi
        przystankami. Dzięki temu rozkłady są zawsze aktualne i dokładne, nawet
        w przypadku zmian w sieci połączeń.
      </p>
      <p>
        Zarządzanie całą stroną jest możliwe dzięki rozbudowanemu{' '}
        <strong>panelowi administratora</strong>. Pozwala on na szybkie i
        wygodne dodawanie nowych linii, przystanków, brygad oraz rozkładów jazdy
        — wszystko bez konieczności edytowania kodu źródłowego.
        <strong>
          Każda zmiana wprowadzona w panelu jest natychmiastowo widoczna
        </strong>{' '}
        na stronie użytkownika, co gwarantuje płynne i bezproblemowe
        aktualizowanie danych.
      </p>
      <p>
        Projekt został zaprojektowany z myślą o{' '}
        <strong>prostocie użytkowania</strong> oraz{' '}
        <strong>elastyczności rozwoju</strong> w przyszłości. Zarówno interfejs
        użytkownika, jak i panel administracyjny są responsywne i dostosowane do
        urządzeń mobilnych, co pozwala zarządzać stroną oraz przeglądać rozkłady
        praktycznie z każdego miejsca.
      </p>
      <p>
        Cały system działa w oparciu o nowoczesne technologie webowe i został
        stworzony z myślą o łatwej rozbudowie oraz długoterminowym utrzymaniu.
      </p>
      <h4>Link do wszystkich linii naniesionych na jedną mape: </h4>
      <a href="https://metrodreamin.com/view/c1gyRGRtbXEyQmh4MzV3emhTZnV0dDIyQldYMnww">
        https://metrodreamin.com/view/c1gyRGRtbXEyQmh4MzV3emhTZnV0dDIyQldYMnww
      </a>
      <h4>Struktura bazy danych</h4>
      <p>
        Poniżej możesz zobaczyć schemat struktury bazy danych używanej w
        projekcie GKM — pokazuje ona relacje między liniami, przystankami oraz
        kursami. Dzięki odpowiedniemu rozplanowaniu danych mogłem stworzyć
        wydajny i skalowalny system.
      </p>
      <iframe
        width="100%"
        height="500px"
        style={{
          boxShadow: '0 2px 8px 0 rgba(63,69,81,0.16); border-radius:15px;',
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
            href="https://github.com/elzbietagawickaLOVE/GKM"
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
