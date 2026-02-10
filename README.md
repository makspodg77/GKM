# GKM – Goleniów Komunikacja Miejska

## O projekcie

Mieszkam w małej wsi Kliniska Wielkie, około 10 minut samochodem od obrzeży Szczecina.  
Poziom komunikacji w Szczecinie był i jest dla mnie imponujący. Zadałem sobie więc pytanie:

> **Co by było, gdyby miastem wojewódzkim był Goleniów zamiast Szczecina?**

---

## Geneza pomysłu

Pomysł na projekt narodził się podczas mojego treningu w grudniu 2023 roku, kiedy zacząłem się zastanawiać:  
**co bym wprowadził, gdybym miał taką możliwość?**

Po wielu iteracjach i pomysłach zaprojektowałem linię, którą motywują moje osobiste odczucia, ale ma w sobie też ziarnko prawdy. Ma ona bardzo dużo wspólnego z goleniowską gminną linią **9**.

Była to linia **95** (która istnieje do dziś, w nieco zmienionej formie).

W mojej wizji miała kursować między:

- **Kliniska Rzemieślnicza** – pętlą łączącą sołectwa tej części gminy  
- **ul. Wolińską w Goleniowie** (przy Kauflandzie)

Numer linii miał duchowo łączyć ją z komunikacją miejską w Szczecinie, w której akurat w tamtym okresie tego numeru brakowało.  
(Dziś linia 95 łączy szpital przy Unii Lubelskiej z Osiedlem Zawadzkiego).

---

## Rozwój koncepcji

Ta pierwsza wizja zainspirowała mnie do dalszych dygresji.  
Od tamtego czasu poznałem historię komunikacji miejskiej:

- Szczecina  
- Świnoujścia  
- Goleniowa  

Zgłębiłem także temat transportu kolejowego.

Dzięki dokładnym analizom zrozumiałem, jak te miasta zarządzają swoimi sieciami transportowymi.  
Połączyłem:

- istniejącą infrastrukturę  
- infrastrukturę, która istniała w przeszłości  
- oraz taką, która kiedyś mogłaby powstać  

---

## Imersja i realizm

Chciałem, aby aplikacja tworzyła jak najrzetelniejsze uczucie imersji — tak, jakby wszystkie kursy naprawdę miały miejsce.

Z tego powodu stworzyłem wiele widoków replikujących elementy świata rzeczywistego, takich jak:

- elektroniczne tablice informacji pasażerskiej  
- rzeczywiste lokalizacje pojazdów  

---

## Interfejs użytkownika

Interfejs użytkownika wzorowałem na stronie **ZDiTM Szczecin**, ponieważ:

- jestem z nią najlepiej zaznajomiony  
- uważam ją za bardzo intuicyjną  

Strona, na której teraz jesteś, to **druga wersja aplikacji**, która posiada m.in.:

- linie okrężne  
- linie nocne  
- przystanki opcjonalne  
- podgląd trasy linii  
- podgląd lokalizacji przystanku  

---

## Backend i panel administracyjny

Dla użytkownika końcowego dostępna jest część prezentująca:

- rozkłady jazdy  
- mapy  

Od strony backendu stworzyłem panel zarządzania siecią komunikacji miejskiej, który umożliwia:

- dodawanie nowych typów linii  
- tworzenie zespołów przystankowych  
- zarządzanie przystankami i połączeniami  

👉 **Panel administracyjny:**  
https://github.com/makspodg77/gkm-admin2.0  

Panel istnieje w dwóch wersjach — nowsza umożliwia bardziej zaawansowane i wygodne wprowadzanie danych.

---

## Aktualny stan projektu

Obecnie strona **komunikacjagoleniow.pl** (wcześniej **goleniowkm.pl**) działa w oparciu o dane wprowadzone właśnie przez ten panel.

---

## Plany na przyszłość

- dalszy rozwój siatki komunikacyjnej powiatu  
- długotrwałe wsparcie techniczne  
- przypisanie brygad do linii i kursów (a może nawet pracowników?)  
- ~~symulacja systemu lokalizacji GPS~~ *(zrealizowane)*  
- symulacja funkcjonalności zajezdni  
- wydarzenia losowe (awarie pojazdów, opóźnienia, odwołane kursy)  

---

## Technologie

Projekt został zbudowany przy użyciu:

- **React** – frontend  
- **Node.js** – backend  
- **PostgreSQL** – baza danych (wcześniej SQL Server)  

Dane dotyczące linii, przystanków i rozkładów jazdy są generowane automatycznie.  
Godziny odjazdów obliczane są na podstawie wyjazdu brygady z pętli, z uwzględnieniem czasów przejazdu pomiędzy przystankami.

Dzięki temu rozkłady są zawsze aktualne i spójne.

---

## Zarządzanie i aktualizacje

Cała strona zarządzana jest przez panel administratora.  
Każda zmiana wprowadzona w panelu jest **natychmiast widoczna** na stronie użytkownika, bez konieczności edycji kodu źródłowego.

System został zaprojektowany z myślą o:

- prostocie użytkowania  
- elastyczności rozwoju  
- długoterminowym utrzymaniu  

---

## Przydatne strony

- https://www.bazakolejowa.pl  
- https://www.mkm.szczecin.pl  
- https://www.zditm.szczecin.pl  

---

## Mapa wszystkich linii

👉 https://metrodreamin.com/view/c1gyRGRtbXEyQmh4MzV3emhTZnV0dDIyQldYMnww  

---

## Kod i kontakt

- **Repozytorium projektu:**  
  https://github.com/makspodg77/GKM  

- **E-mail:**  
  makspodg77@gmail.com  

---

Proces tworzenia był dla mnie samą przyjemnością i mam nadzieję, że korzystanie z projektu jest równie przyjemne ❤️🐱
