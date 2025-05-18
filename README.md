# 🚌 GKM – Goleniowska Komunikacja Miejska

Aplikacja webowo symylująca wyimagowany system komunikacji miejskiej. Zbudowana w **Vite + Express + MS SQL**.

## 🔧 Technologie

- **Frontend:** React + Vite  
- **Backend:** Node.js + Express  
- **Baza danych:** Microsoft SQL Server  

## 📱 Funkcje aplikacji

- Przeglądanie przystanków i ich lokalizacji
- Wyświetlanie tras i linii
- Rozkłady jazdy z podziałem na kursy
- Oznaczenia kursów specjalnych (np. skróconych) kolorami i podpisami
- Rzeczywiste godziny odjazdów

## 🗃 Struktura danych

System oparty na relacyjnej bazie danych:

- `stop`, `stop_group` – dane o przystankach
- `route`, `line`, `full_route`, `departure_route` – struktura tras i linii
- `timetable` – rozkłady godzinowe
- `line_type`, `news` – dane pomocnicze

## 💻 Przykładowe widoki

- `/api/lines` – podgląd wszystkich linii
- `/api/timetable/88` – wszystkie odjazdy z przystanku z id = 88 w ciągu dnia

## 🚀 Uruchomienie lokalne

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

> Upewnij się, że baza MS SQL jest uruchomiona i dostępna.
