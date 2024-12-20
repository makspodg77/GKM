const sql = require("msnodesqlv8");
const config = require("./utils/config");
const connectionString = config.CONNECTION_STRING;

const dropTables = `
    DROP TABLE IF EXISTS timetable;
    DROP TABLE IF EXISTS routes;
    DROP TABLE IF EXISTS transport_lines;
    DROP TABLE IF EXISTS transport_stops;
    DROP TABLE IF EXISTS line_types;
    DROP TABLE IF EXISTS news;
`;

const createLineTypesTable = `
    CREATE TABLE line_types (
        id INT PRIMARY KEY,
        line_type_name VARCHAR(255) NOT NULL,
        line_type_color NVARCHAR(255) NOT NULL,
        line_type_image VARCHAR(255) NOT NULL
    );
`;

const createTransportStopsTable = `
    CREATE TABLE transport_stops (
        id BIGINT PRIMARY KEY,
        stop_name VARCHAR(255) NOT NULL,
        stop_direction BIT
    );
`;

const createNewsTable = `
    CREATE TABLE news (
        id BIGINT PRIMARY KEY IDENTITY(1,1),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT GETDATE()
    );
`;

const createTransportLinesTable = `
    CREATE TABLE transport_lines (
        id INT PRIMARY KEY,
        line_name VARCHAR(255) NOT NULL,
        line_type_id INT NOT NULL,
        FOREIGN KEY (line_type_id) REFERENCES line_types(id)
    );
`;

const createRoutesTable = `
    CREATE TABLE routes (
        id INT PRIMARY KEY,
        line_id INT,
        stop_id INT,
        stop_number INT,
        route_number INT,
        travel_time INT,
        is_on_request BIT
    );
`;

const createTimetableTable = `
    CREATE TABLE timetable (
        id INT PRIMARY KEY,
        route_number INT,
        departure_time VARCHAR(255) NOT NULL,
    );
`;

const insertLineTypesData = `
    INSERT INTO line_types (id, line_type_name, line_type_color, line_type_image)
    VALUES
        (1, 'Linie autobusowe dzienne', '#FF0000', 'city.png'),
        (2, 'Linie tramwajowe dzienne', '#00FF00', 'suburban.png'),
        (3, 'Linie autobusowe nocne', '#0000FF', 'interurban.png'),
        (4, 'Linie autobusowe dzienne dodatkowe', '#0000FF', 'interurban.png');`;

const insertTransportStopsData = `
        INSERT INTO transport_stops (id, stop_name, stop_direction)
        VALUES
            (17, 'Kliniska Rzemieślnicza', 1),
            (18, 'Kliniska Rzemieślnicza', 0),
            (19, 'Kliniska Szkoła', 1),
            (20, 'Kliniska Szkoła', 0),
            (21, 'SKM Kliniska', 1),
            (22, 'SKM Kliniska', 0),
            (23, 'Kliniska Nadleśnictwo', 1),
            (24, 'Kliniska Nadleśnictwo', 0),
            (25, 'Pucie', 1),
            (26, 'Pucie', 0),
            (27, 'Łęsko', 1),
            (28, 'Łęsko', 0),
            (29, 'Stawno', 1),
            (30, 'Stawno', 0),
            (31, 'Stawno Krzyżówka', 1),
            (32, 'Stawno Krzyżówka', 0),
            (33, 'Bolechowo', 1),
            (34, 'Bolechowo', 0),
            (35, 'Pucice Krzyż', 1),
            (36, 'Pucice Krzyż', 0),
            (37, 'Czarna Łąka Turystyczna', 1),
            (38, 'Czarna Łąka Turystyczna', 0),
            (39, 'Czarna Łąka Plażowa', 1),
            (40, 'Czarna Łąka Plażowa', 0),
            (41, 'Lubczyna Dino', 1),
            (42, 'Lubczyna Dino', 0),
            (43, 'Lubczyna Plaża', 1),
            (44, 'Lubczyna Plaża', 0),
            (45, 'Lubczyna Kasztanowa', 1),
            (46, 'Lubczyna Kasztanowa', 0),
            (47, 'Borzysławiec', 1),
            (48, 'Borzysławiec', 0),
            (49, 'Kliniska Klimatyczna', 1),
            (50, 'Kliniska Klimatyczna', 0),
            (51, 'Rurzyca Farmer', 1),
            (52, 'Rurzyca Farmer', 0),
            (53, 'Rurzyca Cmentarz', 1),
            (54, 'Rurzyca Cmentarz', 0),
            (55, 'Dobroszyn', 1),
            (56, 'Dobroszyn', 0),
            (57, 'Warcisławiec', 1),
            (58, 'Warcisławiec', 0),
            (59, 'Rurzyca Las', 1),
            (60, 'Rurzyca Las', 0),
            (61, 'Łozienica Granitowa', 1),
            (62, 'Łozienica Granitowa', 0),
            (63, 'SKM Goleniów Park Przemysłowy', 1),
            (64, 'SKM Goleniów Park Przemysłowy', 0),
            (65, 'Stadion Miejski OSiR', 1),
            (66, 'Stadion Miejski OSiR', 0),
            (67, 'Podańsko Topolowa', 1),
            (68, 'Podańsko Topolowa', 0),
            (69, 'Podańsko Podleśna', 1),
            (70, 'Podańsko Podleśna', 0),
            (71, 'Krzywoustego', 1),
            (72, 'Krzywoustego', 0),
            (73, 'Osiedle Bieda', 1),
            (74, 'Osiedle Bieda', 0),
            (75, 'Rozdzielnia', 1),
            (76, 'Rozdzielnia', 0),
            (77, 'Muzeum Motoryzacji', 1),
            (78, 'Muzeum Motoryzacji', 0),
            (79, 'Nadleśnictwo', 1),
            (80, 'Nadleśnictwo', 0),
            (81, 'Rondo Kasprowicza', 1),
            (82, 'Rondo Kasprowicza', 0),
            (83, 'SKM Goleniów', 1),
            (84, 'SKM Goleniów', 0),
            (85, 'Polna', 1),
            (86, 'Polna', 0),
            (87, 'Ogród Działkowy "Ina"', 1),
            (88, 'Ogród Działkowy "Ina"', 0),
            (89, 'Ks. Włodzimierza Kowalskiego', 1),
            (90, 'Ks. Włodzimierza Kowalskiego', 0),
            (91, 'Zarosty', 1),
            (92, 'Zarosty', 0),
            (93, 'Słowackiego', 1),
            (94, 'Słowackiego', 0),
            (95, 'Wawrzyniaka', 1),
            (96, 'Wawrzyniaka', 0),
            (97, 'Jana Pawła II', 1),
            (98, 'Jana Pawła II', 0),
            (99, 'Rondo Urlicha Schroedera', 1),
            (100, 'Rondo Urlicha Schroedera', 0),
            (101, 'Jana Matejki', 1),
            (102, 'Jana Matejki', 0),
            (103, 'Przestrzenna', 1),
            (104, 'Przestrzenna', 0),
            (105, 'Cmentarz Komunalny', 1),
            (106, 'Cmentarz Komunalny', 0),
            (107, 'Żeromskiego', 1),
            (108, 'Żeromskiego', 0),
            (109, 'Krzewno', 1),
            (110, 'Krzewno', 0),
            (111, 'Skórnica', 1),
            (112, 'Skórnica', 0),
            (113, 'Graniczna', 1),
            (114, 'Graniczna', 0),
            (115, 'Sadowa', 1),
            (116, 'Sadowa', 0),
            (117, 'Anny Jagielonki', 1),
            (118, 'Anny Jagielonki', 0),
            (119, 'Rondo Hanzeatyckie', 1),
            (120, 'Rondo Hanzeatyckie', 0),
            (121, 'ZSP "Dinozaur"', 1),
            (122, 'ZSP "Dinozaur"', 0),
            (123, 'Witosa', 1),
            (124, 'Witosa', 0),
            (125, 'Szkolna', 1),
            (126, 'Szkolna', 0),
            (127, 'Swedwood', 1),
            (128, 'Swedwood', 0),
            (129, 'Załom Kościół', 1),
            (130, 'Załom Kościół', 0),
            (131, 'Załom Leśna', 1),
            (132, 'Załom Leśna', 0),
            (133, 'Załom Starowieyskiego', 1),
            (134, 'Załom Starowieyskiego', 0),
            (135, 'Pucice Leśna', 1),
            (136, 'Pucice Leśna', 0),
            (137, 'Kliniska Księżycowa', 1),
            (138, 'Kliniska Księżycowa', 0),
            (139, 'Kliniska Park', 1),
            (140, 'Kliniska Park', 0),
            (141, 'Czarna Łąka Wczasowa', 1),
            (142, 'Czarna Łąka Wczasowa', 0),
            (143, 'Czarna Łąka Wycieczkowa', 1),
            (144, 'Czarna Łąka Wycieczkowa', 0),
            (145, 'Bystra Przyjazna', 1),
            (146, 'Bystra Przyjazna', 0),
            (147, 'Lubczyna Masztowa', 1),
            (148, 'Lubczyna Masztowa', 0),
            (149, 'OSP Lubczyna', 1),
            (150, 'OSP Lubczyna', 0),
            (151, 'Lubczyna Jesieniowa', 1),
            (152, 'Lubczyna Jesieniowa', 0),
            (153, 'Smolno', 1),
            (154, 'Smolno', 0),
            (155, 'Kanał Jankowski', 1),
            (156, 'Kanał Jankowski', 0),
            (157, 'Prosta', 1),
            (158, 'Prosta', 0);
    `;

const insertTransportLinesData = `INSERT INTO transport_lines(id,line_name,line_type_id)VALUES      
    (2,'95',1),(3,'94',1),(4,'93',1),(5,'22',4), (6, '91', 1), (7, '42', 1), (8, '37', 1), (9, '38', 1);

                                 `;

const insertNewsData = `INSERT INTO news
                                              (title,
                                              content,
                                              created_at)
                                  VALUES     ('Zmiany w komunikacji - korekta nazw zespołów przystankowych',
                                              'Ta Informacja dotyczy linii: 94, 95, 22, (C); <br> <br> <br>Od dnia 14 grudnia 2024 roku, linia C uległa likwidacji.  <br>Wprowadzone zostały również nowe nazwy niektórych przystanków. <br> <br>Wykaz zmienionych nazw: <br> <br>- "Rurzyca Kościół" na "Dobroszyn" (linia 95) <br>- "Rurzyca Myśliwska" na "Warcisławiec" (linia 95) <br>- "Goleniów Stadion" na "Stadion Miejski OSiR" (linia 95) <br>- "Kliniska Las" na "Pucie" (linia 94) <br>- "Helenów Krzywoustego" na "Krzywoustego" (linia 22) <br>- "Przetwornica" na "Rozdzielnia" (linia 22) <br>- "Kasprowicza Rondo" na "Rondo Kasprowicza" (linia 22)',
                                              '2024-12-14 16:08:23.740');`;

const insertRoutesData = `INSERT INTO routes (id, line_id, stop_id, route_number, travel_time, is_on_request, stop_number)
    VALUES
        (126, 8, 130, 90, 0, 0, 1),
        (127, 8, 132, 90, 1, 0, 2),
        (128, 8, 134, 90, 2, 0, 3),
        (129, 8, 136, 90, 2, 0, 4),
        (130, 8, 36, 90, 1, 0, 5),
        (131, 8, 138, 90, 1, 0, 6),
        (132, 8, 18, 90, 1, 0, 7),
        (133, 8, 140, 90, 1, 0, 8),
        (134, 8, 52, 90, 2, 0, 9),
        (135, 8, 54, 90, 3, 0, 10),
        (136, 8, 56, 90, 1, 0, 11),
        (137, 8, 58, 90, 4, 0, 12),
        (138, 8, 60, 90, 5, 0, 13),
        (139, 8, 62, 90, 2, 0, 14),
        (140, 8, 64, 90, 1, 0, 15),
        (141, 8, 66, 90, 5, 0, 16),
        (142, 8, 65, 91, 0, 0, 1),
        (143, 8, 63, 91, 5, 0, 2),
        (144, 8, 61, 91, 1, 0, 3),
        (145, 8, 59, 91, 2, 0, 4),
        (146, 8, 57, 91, 5, 0, 5),
        (147, 8, 55, 91, 4, 0, 6),
        (148, 8, 53, 91, 1, 0, 7),
        (149, 8, 51, 91, 3, 0, 8),
        (150, 8, 139, 91, 2, 0, 9),
        (151, 8, 17, 91, 1, 0, 10),
        (152, 8, 137, 91, 1, 0, 11),
        (153, 8, 35, 91, 1, 0, 12),
        (154, 8, 135, 91, 2, 0, 13),
        (155, 8, 133, 91, 2, 0, 14),
        (156, 8, 131, 91, 1, 0, 15),
        (157, 8, 129, 91, 1, 0, 16),

        (1, 7, 86, 7, 0, 0, 1),
        (2, 7, 88, 7, 2, 0, 2),
        (3, 7, 90, 7, 1, 0, 3),
        (4, 7, 92, 7, 1, 0, 4),
        (5, 7, 114, 7, 1, 0, 5),
        (6, 7, 116, 7, 1, 0, 6),
        (7, 7, 118, 7, 1, 0, 7),
        (8, 7, 120, 7, 1, 0, 8),
        (9, 7, 122, 7, 1, 0, 9),
        (10, 7, 124, 7, 1, 0, 10),
        (11, 7, 126, 7, 1, 0, 11),
        (12, 7, 128, 7, 1, 0, 12),
        (13, 7, 84, 7, 1, 0, 13),
        (14, 7, 85, 8, 2, 0, 13),
        (15, 7, 87, 8, 1, 0, 12),
        (16, 7, 89, 8, 1, 0, 11),
        (17, 7, 91, 8, 1, 0, 10),
        (18, 7, 113, 8, 1, 0, 9),
        (19, 7, 115, 8, 1, 0, 8),
        (20, 7, 117, 8, 1, 0, 7),
        (21, 7, 119, 8, 1, 0, 6),
        (22, 7, 121, 8, 1, 0, 5),
        (23, 7, 123, 8, 1, 0, 4),
        (24, 7, 125, 8, 1, 0, 3),
        (25, 7, 127, 8, 1, 0, 2),
        (3000, 7, 83, 8, 0, 0, 1),
        
        (26, 6, 86, 9, 0, 0, 1),
        (27, 6, 88, 9, 2, 0, 2),
        (28, 6, 90, 9, 1, 0, 3),
        (29, 6, 92, 9, 1, 0, 4),
        (30, 6, 94, 9, 1, 0, 5),
        (31, 6, 96, 9, 1, 0, 6),
        (32, 6, 98, 9, 1, 0, 7),
        (33, 6, 100, 9, 1, 0, 8),
        (34, 6, 102, 9, 1, 0, 9),
        (35, 6, 104, 9, 1, 0, 10),
        (36, 6, 106, 9, 1, 0, 11),
        (37, 6, 66, 9, 2, 0, 12),
        (38, 6, 108, 9, 2, 0, 13),
        (39, 6, 110, 9, 1, 0, 14),
        (40, 6, 112, 9, 1, 0, 15),
        (41, 6, 85, 10, 2, 0, 15),
        (42, 6, 87, 10, 1, 0, 14),
        (43, 6, 89, 10, 1, 0, 13),
        (44, 6, 91, 10, 1, 0, 12),
        (45, 6, 93, 10, 1, 0, 11),
        (46, 6, 95, 10, 1, 0, 10),
        (47, 6, 97, 10, 1, 0, 9),
        (48, 6, 99, 10, 1, 0, 8),
        (49, 6, 101, 10, 1, 0, 7),
        (50, 6, 103, 10, 1, 0, 6),
        (51, 6, 105, 10, 2, 0, 5),
        (52, 6, 65, 10, 1, 0, 4),
        (53, 6, 107, 10, 1, 0, 3),
        (54, 6, 109, 10, 1, 0, 2),
        (55, 6, 111, 10, 0, 0, 1),

        (56, 9, 130, 11, 0, 0, 1),
        (57, 9, 132, 11, 1, 0, 2),
        (58, 9, 134, 11, 2, 0, 3),
        (59, 9, 136, 11, 2, 0, 4),
        (60, 9, 36, 11, 1, 0, 5),
        (61, 9, 142, 11, 1, 0, 6),
        (62, 9, 144, 11, 1, 0, 7),
        (63, 9, 40, 11, 1, 0, 8),
        (64, 9, 146, 11, 1, 0, 9),
        (65, 9, 148, 11, 4, 0, 10),
        (66, 9, 150, 11, 1, 0, 11),
        (67, 9, 152, 11, 1, 0, 12),
        (68, 9, 154, 11, 2, 0, 13),
        (69, 9, 156, 11, 8, 0, 14),
        (70, 9, 158, 11, 1, 0, 15),
        (71, 9, 66, 11, 3, 0, 16),
        (72, 9, 129, 12, 1, 0, 16),
        (73, 9, 131, 12, 2, 0, 15),
        (74, 9, 133, 12, 2, 0, 14),
        (75, 9, 135, 12, 1, 0, 13),
        (76, 9, 35, 12, 1, 0, 12),
        (77, 9, 141, 12, 1, 0, 11),
        (78, 9, 143, 12, 1, 0, 10),
        (79, 9, 39, 12, 1, 0, 9),
        (80, 9, 145, 12, 4, 0, 8),
        (81, 9, 147, 12, 1, 0, 7),
        (82, 9, 149, 12, 1, 0, 6),
        (83, 9, 151, 12, 2, 0, 5),
        (84, 9, 153, 12, 8, 0, 4),
        (85, 9, 155, 12, 1, 0, 3),
        (86, 9, 157, 12, 3, 0, 2),
        (87, 9, 65, 12, 0, 0, 1),

        (105, 5, 67, 22, 0, 0, 1),
        (88, 5, 69, 22, 4, 0, 2),
        (89, 5, 71, 22, 3, 0, 3),
        (90, 5, 73, 22, 2, 0, 4),
        (91, 5, 75, 22, 5, 0, 5),
        (92, 5, 77, 22, 2, 0, 6),
        (93, 5, 79, 22, 3, 0, 7),
        (94, 5, 81, 22, 2, 0, 8),
        (95, 5, 83, 22, 2, 0, 9),
        (96, 5, 68, 23, 4, 0, 9),
        (97, 5, 70, 23, 3, 0, 8),
        (98, 5, 72, 23, 2, 0, 7),
        (99, 5, 74, 23, 5, 0, 6),
        (100, 5, 76, 23, 2, 0, 5),
        (101, 5, 78, 23, 3, 0, 4),
        (102, 5, 80, 23, 2, 0, 3),
        (103, 5, 82, 23, 2, 0, 2),
        (104, 5, 84, 23, 0, 0, 1),

        (158, 2, 18, 3, 0, 0, 1),
        (106, 2, 139, 3, 1, 0, 2),
        (107, 2, 50, 3, 2, 0, 3),
        (108, 2, 52, 3, 2, 0, 4),
        (109, 2, 54, 3, 3, 0, 5),
        (110, 2, 56, 3, 1, 0, 6),
        (111, 2, 58, 3, 4, 0, 7),
        (112, 2, 60, 3, 5, 0, 8),
        (113, 2, 62, 3, 2, 0, 9),
        (114, 2, 64, 3, 1, 0, 10),
        (115, 2, 66, 3, 5, 0, 11),
        (116, 2, 17, 4, 1, 0, 11),
        (117, 2, 139, 4, 2, 0, 10),
        (118, 2, 48, 4, 2, 0, 9),
        (119, 2, 51, 4, 3, 0, 8),
        (120, 2, 53, 4, 1, 0, 7),
        (121, 2, 55, 4, 4, 0, 6),
        (122, 2, 57, 4, 5, 0, 5),
        (123, 2, 59, 4, 2, 0, 4),
        (124, 2, 61, 4, 1, 0, 3),
        (125, 2, 63, 4, 5, 0, 2),
        (159, 2, 65, 4, 0, 0, 1),

        (160, 4, 17, 93, 0, 0, 1),
        (161, 4, 35, 93, 4, 0, 2),
        (162, 4, 37, 93, 3, 0, 3),
        (163, 4, 39, 93, 2, 0, 4),
        (164, 4, 41, 93, 2, 0, 5),
        (165, 4, 43, 93, 3, 0, 6),
        (166, 4, 45, 93, 4, 0, 7),
        (167, 4, 47, 93, 4, 0, 8),
        (168, 4, 18, 94, 4, 0, 8),
        (169, 4, 36, 94, 3, 0, 7),
        (170, 4, 38, 94, 2, 0, 6),
        (171, 4, 40, 94, 2, 0, 5),
        (172, 4, 42, 94, 3, 0, 4),
        (173, 4, 44, 94, 4, 0, 3),
        (174, 4, 46, 94, 4, 0, 2),
        (175, 4, 48, 94, 0, 0, 1),

        (193, 3, 18, 5, 0, 0, 1),
        (176, 3, 20, 5, 2, 0, 2),
        (177, 3, 22, 5, 2, 0, 3),
        (178, 3, 24, 5, 4, 0, 4),
        (179, 3, 26, 5, 6, 0, 5),
        (180, 3, 28, 5, 6, 0, 6),
        (181, 3, 30, 5, 5, 0, 7),
        (182, 3, 32, 5, 2, 0, 8),
        (183, 3, 34, 5, 4, 0, 9),
        (184, 3, 17, 6, 2, 0, 9),
        (185, 3, 19, 6, 2, 0, 8),
        (186, 3, 21, 6, 4, 0, 7),
        (187, 3, 23, 6, 6, 0, 6),
        (188, 3, 25, 6, 6, 0, 5),
        (189, 3, 27, 6, 5, 0, 4),
        (190, 3, 29, 6, 2, 0, 3),
        (191, 3, 31, 6, 4, 0, 2),
        (192, 3, 33, 6, 0, 0, 1);
        `;

const insertTimetableData = `
    INSERT INTO timetable (id, route_number, departure_time)
    VALUES
        (37, 22, '22:02'),
        (38, 23, '22:02'),
        (39, 94, '19:08'),
        (40, 94, '11:42'),
        (44, 3, '5:05'),
        (45, 3, '5:45'),
        (46, 3, '6:25'),
        (47, 3, '6:55'),
        (48, 3, '6:40'),
        (49, 3, '7:15'),
        (50, 3, '7:30'),
        (51, 3, '7:45'),
        (52, 3, '8:00'),
        (53, 3, '8:30'),
        (54, 3, '9:00'),
        (55, 3, '9:40'),
        (56, 3, '10:20'),
        (57, 3, '11:00'),
        (58, 3, '11:40'),
        (59, 3, '12:32'),
        (60, 3, '13:00'),
        (61, 3, '13:32'),
        (62, 3, '14:00'),
        (63, 3, '14:42'),
        (64, 3, '15:10'),
        (65, 3, '15:40'),
        (66, 3, '16:10'),
        (67, 3, '16:30'),
        (68, 3, '16:50'),
        (69, 3, '17:15'),
        (70, 3, '17:35'),
        (71, 3, '18:10'),
        (72, 3, '19:00'),
        (73, 3, '19:50'),
        (74, 3, '20:30'),
        (75, 3, '21:20'),
        (76, 3, '23:02'),
        (77, 4, '4:56'),
        (78, 4, '5:30'),
        (79, 4, '6:10'),
        (80, 4, '6:30'),
        (81, 4, '6:50'),
        (82, 4, '7:10'),
        (83, 4, '7:30'),
        (84, 4, '7:55'),
        (85, 4, '8:25'),
        (86, 4, '8:55'),
        (87, 4, '9:30'),
        (88, 4, '10:10'),
        (89, 4, '11:52'),
        (90, 4, '12:41'),
        (91, 4, '13:20'),
        (92, 4, '13:49'),
        (93, 4, '14:31'),
        (94, 4, '15:02'),
        (95, 4, '15:35'),
        (96, 4, '16:05'),
        (97, 4, '16:26'),
        (98, 4, '16:47'),
        (99, 4, '17:30'),
        (100, 4, '18:03'),
        (101, 4, '18:43'),
        (102, 4, '19:14'),
        (103, 4, '19:45'),
        (104, 4, '20:15'),
        (105, 4, '20:59'),
        (106, 4, '21:44'),
        (107, 4, '22:58'),
        (108, 93, '5:10'),
        (109, 93, '6:02'),
        (110, 93, '7:02'),
        (111, 93, '7:51'),
        (112, 93, '8:50'),
        (113, 93, '9:42'),
        (114, 93, '10:28'),
        (115, 93, '10:59'),
        (116, 93, '11:43'),
        (117, 93, '12:30'),
        (118, 93, '13:01'),
        (119, 93, '14:00'),
        (120, 93, '14:30'),
        (121, 93, '15:01'),
        (122, 93, '15:31'),
        (123, 93, '16:00'),
        (124, 93, '16:13'),
        (125, 93, '16:37'),
        (126, 93, '16:44'),
        (127, 93, '17:03'),
        (128, 93, '17:33'),
        (129, 93, '18:10'),
        (130, 93, '18:40'),
        (131, 93, '19:05'),
        (132, 93, '19:25'),
        (133, 93, '19:44'),
        (134, 93, '20:15'),
        (135, 93, '20:45'),
        (136, 93, '21:20'),
        (137, 93, '22:42'),
        (138, 94, '4:51'),
        (139, 94, '5:20'),
        (140, 94, '5:59'),
        (141, 94, '6:29'),
        (142, 94, '7:01'),
        (143, 94, '7:42'),
        (144, 94, '8:20'),
        (145, 94, '9:00'),
        (146, 94, '9:47'),
        (147, 94, '10:24'),
        (148, 94, '11:02'),
        (149, 94, '11:48'),
        (150, 94, '12:36'),
        (151, 94, '13:08'),
        (152, 94, '13:48'),
        (153, 94, '14:25'),
        (154, 94, '14:55'),
        (155, 94, '15:26'),
        (156, 94, '16:01'),
        (157, 94, '16:41'),
        (158, 94, '17:24'),
        (159, 94, '17:54'),
        (160, 94, '18:27'),
        (161, 94, '18:57'),
        (162, 94, '19:27'),
        (163, 94, '19:47'),
        (164, 94, '20:07'),
        (165, 94, '20:27'),
        (166, 94, '20:47'),
        (167, 94, '21:17'),
        (168, 94, '21:50'),
        (169, 94, '22:30'),
        (170, 5, '5:50'),
        (171, 5, '6:50'),
        (172, 5, '7:31'),
        (173, 5, '8:01'),
        (174, 5, '9:40'),
        (175, 5, '10:20'),
        (176, 5, '11:00'),
        (177, 5, '11:40'),
        (178, 5, '12:20'),
        (179, 5, '12:50'),
        (181, 5, '13:31'),
        (182, 5, '14:09'),
        (183, 5, '14:49'),
        (184, 5, '15:39'),
        (185, 5, '16:19'),
        (186, 5, '16:59'),
        (187, 5, '17:39'),
        (188, 5, '18:19'),
        (189, 5, '19:10'),
        (190, 5, '19:40'),
        (191, 5, '20:30'),
        (192, 5, '21:29'),
        (193, 5, '22:29'),
        (194, 5, '23:19'),
        (195, 6, '5:40'),
        (196, 6, '6:25'),
        (197, 6, '7:04'),
        (198, 6, '7:44'),
        (199, 6, '8:22'),
        (200, 6, '8:42'),
        (201, 6, '9:13'),
        (202, 6, '9:50'),
        (203, 6, '10:20'),
        (204, 6, '11:15'),
        (205, 6, '12:01'),
        (206, 6, '12:41'),
        (207, 6, '13:21'),
        (208, 6, '13:58'),
        (209, 6, '14:34'),
        (210, 6, '15:02'),
        (211, 6, '15:41'),
        (212, 6, '16:30'),
        (213, 6, '17:08'),
        (214, 6, '17:52'),
        (215, 6, '18:38'),
        (216, 6, '19:05'),
        (217, 6, '19:55'),
        (218, 6, '20:50'),
        (219, 6, '22:02'),
        (220, 7, '23:00'),
        (221, 8, '23:00'),
        (222, 9, '23:00'),
        (223, 10, '23:00'),
        (224, 90, '23:00'),
        (225, 91, '23:00'),
        (226, 11, '23:00'),
        (227, 12, '23:00');

`;

const executeQuery = (query, callback) => {
  console.log("Executing query:", query.split("\n")[1].trim());
  sql.query(connectionString, query, (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
    } else {
      console.log("Query executed successfully.");
    }
    if (callback) callback(err, result);
  });
};

const initializeTables = () => {
  executeQuery(dropTables, (err) => {
    if (!err) {
      executeQuery(createLineTypesTable, (err) => {
        if (!err) {
          executeQuery(createTransportStopsTable, (err) => {
            if (!err) {
              executeQuery(createNewsTable, (err) => {
                if (!err) {
                  executeQuery(createTransportLinesTable, (err) => {
                    if (!err) {
                      executeQuery(createRoutesTable, (err) => {
                        if (!err) {
                          executeQuery(createTimetableTable, (err) => {
                            if (!err) {
                              executeQuery(insertLineTypesData, (err) => {
                                if (!err) {
                                  executeQuery(
                                    insertTransportStopsData,
                                    (err) => {
                                      if (!err) {
                                        executeQuery(
                                          insertTransportLinesData,
                                          (err) => {
                                            if (!err) {
                                              executeQuery(
                                                insertRoutesData,
                                                (err) => {
                                                  if (!err) {
                                                    executeQuery(
                                                      insertTimetableData,
                                                      (err) => {
                                                        if (!err) {
                                                          executeQuery(
                                                            insertNewsData
                                                          );
                                                        }
                                                      }
                                                    );
                                                  }
                                                }
                                              );
                                            }
                                          }
                                        );
                                      }
                                    }
                                  );
                                }
                              });
                            }
                          });
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  });
};

initializeTables();
