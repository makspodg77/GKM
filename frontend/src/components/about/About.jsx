const About = () => {
  return (
    <>
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
        zespołów przystankowych, przystanków i połączeń. Panel zarządzania, do
        którego można przejść [tutaj] (kliknij, aby przejść do panelu), także ma
        dwie wersje — druga umożliwia bardziej zaawansowane i wygodniejsze
        wprowadzanie danych.
      </p>{' '}
      <p>
        Obecnie strona goleniowkm.pl działa w oparciu o dane wprowadzone przez
        [link do panelu].
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
    </>
  );
};

export default About;
