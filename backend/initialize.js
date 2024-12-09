const sql = require('msnodesqlv8');
const config = require('./utils/config');
const connectionString = config.CONNECTION_STRING;

const dropTables = `
    DROP TABLE IF EXISTS timetable;
    DROP TABLE IF EXISTS routes;
    DROP TABLE IF EXISTS transport_lines;
    DROP TABLE IF EXISTS transport_stops;
    DROP TABLE IF EXISTS line_types;
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
        FOREIGN KEY (route_number) REFERENCES routes(id)
    );
`;

const insertExampleData = `
    INSERT INTO line_types (id, line_type_name, line_type_color, line_type_image)
    VALUES
        (1, 'Linie autobusowe dzienne', '#FF0000', 'city.png'),
        (2, 'Linie tramwajowe dzienne', '#00FF00', 'suburban.png'),
        (3, 'Linie autobusowe nocne', '#0000FF', 'interurban.png'),
        (4, 'Linie autobusowe dzienne dodatkowe', '#0000FF', 'interurban.png');

   INSERT INTO transport_stops (id, stop_name, stop_direction)
    VALUES
        (1, 'Osiedle Kasztanowe', 1),
        (2, 'SKM Załom (Kablowa)', 1),
        (3, 'Załom Kościół', 1),
        (4, 'Załom Parkowa', 1),
        (5, 'Lubczyńska', 1),
        (6, 'Kniewska', 1),
        (7, 'SKM Trzebusz', 1),
        (8, 'Dąbie Osiedle', 1),
        (9, 'Osiedle Kasztanowe', 0),
        (10, 'SKM Załom (Kablowa)', 0),
        (11, 'Załom Kościół', 0),
        (12, 'Załom Parkowa', 0),
        (13, 'Lubczyńska', 0),
        (14, 'Kniewska', 0),
        (15, 'SKM Trzebusz', 0),
        (16, 'Dąbie Osiedle', 0),
        (17, 'Kliniska Rzemieślnicza', 1),
        (18, 'Kliniska Szkoła', 1),
        (19, 'SKM Kliniska', 1),
        (20, 'Kliniska Nadleśnictwo', 1),
        (21, 'Kliniska Las', 1),
        (22, 'Łęsko', 1),
        (23, 'Stawno', 1),
        (24, 'Stawno Krzyżówka', 1),
        (25, 'Bolechowo', 1),
        (26, 'Pucice Krzyż', 1),
        (27, 'Czarna Łąka Turystyczna', 1),
        (28, 'Czarna Łąka Plażowa', 1),
        (29, 'Lubczyna Dino', 1),
        (30, 'Lubczyna Plaża', 1),
        (31, 'Lubczyna Kasztanowa', 1),
        (32, 'Borzysławiec', 1),
        (33, 'Kliniska Rzemieślnicza', 0),
        (34, 'Kliniska Szkoła', 0),
        (35, 'SKM Kliniska', 0),
        (36, 'Kliniska Nadleśnictwo', 0),
        (37, 'Kliniska Las', 0),
        (38, 'Łęsko', 0),
        (39, 'Stawno', 0),
        (40, 'Stawno Krzyżówka', 0),
        (41, 'Bolechowo', 0),
        (42, 'Pucice Krzyż', 0),
        (43, 'Czarna Łąka Turystyczna', 0),
        (44, 'Czarna Łąka Plażowa', 0),
        (45, 'Lubczyna Dino', 0),
        (46, 'Lubczyna Plaża', 0),
        (47, 'Lubczyna Kasztanowa', 0),
        (48, 'Borzysławiec', 0),
        (49, 'Kliniska Klimatyczna', 1),
        (50, 'Rurzyca Farmer', 1),
        (51, 'Rurzyca Cmentarz', 1),
        (52, 'Rurzyca Kościół', 1),
        (53, 'Rurzyca Myśliwska', 1),
        (54, 'Rurzyca Las', 1),
        (55, 'Łozienica Granitowa', 1),
        (56, 'SKM Goleniów Park Przemysłowy', 1),
        (57, 'Goleniów Stadion', 1),
        (58, 'Kliniska Klimatyczna', 0),
        (59, 'Rurzyca Farmer', 0),
        (60, 'Rurzyca Cmentarz', 0),
        (61, 'Rurzyca Kościół', 0),
        (62, 'Rurzyca Myśliwska', 0),
        (63, 'Rurzyca Las', 0),
        (64, 'Łozienica Granitowa', 0),
        (65, 'SKM Goleniów Park Przemysłowy', 0),
        (66, 'Goleniów Stadion', 0),
        (67, 'Podańsko Topolowa', 0),
        (68, 'Podańsko Topolowa', 1),
        (69, 'Podańsko Podleśna', 0),
        (70, 'Podańsko Podleśna', 1),
        (71, 'Helenów Krzywoustego', 0),
        (72, 'Helenów Krzywoustego', 1),
        (73, 'Osiedle Bieda', 0),
        (74, 'Osiedle Bieda', 1),
        (75, 'Przetwornica', 0),
        (76, 'Przetwornica', 1),
        (77, 'Muzeum Motoryzacji', 0),
        (78, 'Muzeum Motoryzacji', 1),
        (79, 'Nadleśnictwo', 0),
        (80, 'Nadleśnictwo', 1),
        (81, 'Kasprowicza Rondo', 0),
        (82, 'Kasprowicza Rondo', 1),
        (83, 'SKM Goleniów', 0),
        (84, 'SKM Goleniów', 1);
    INSERT INTO transport_lines (id, line_name, line_type_id)
    VALUES
        (1, 'C', 1),
        (2, '95', 1),
        (3, '94', 1),
        (4, '93', 1),
        (5, '22', 4);

    INSERT INTO routes (id, line_id, stop_id, route_number, travel_time, is_on_request, stop_number)
    VALUES
        (1, 1, 1, 1, 0, 0, 1),
        (2, 1, 2, 1, 3, 0, 2),
        (3, 1, 3, 1, 2, 0, 3),
        (4, 1, 4, 1, 2, 0, 4),
        (5, 1, 5, 1, 1, 1, 5),
        (6, 1, 6, 1, 1, 1, 6),
        (7, 1, 7, 1, 2, 0, 7),
        (8, 1, 8, 1, 5, 0, 8),
        (9, 1, 16, 2, 4, 0, 8),
        (10, 1, 15, 2, 3, 0, 7),
        (11, 1, 14, 2, 2, 0, 6),
        (12, 1, 13, 2, 2, 0, 5),
        (13, 1, 12, 2, 1, 1, 4),
        (14, 1, 11, 2, 1, 1, 3),
        (15, 1, 10, 2, 2, 0, 2),
        (16, 1, 9, 2, 0, 0, 1),
        (17, 2, 33, 3, 0, 0, 1),
        (18, 2, 58, 3, 2, 0, 2),
        (19, 2, 59, 3, 2, 0, 3),
        (20, 2, 60, 3, 3, 0, 4),
        (21, 2, 61, 3, 1, 0, 5),
        (22, 2, 62, 3, 4, 0, 6),
        (23, 2, 63, 3, 5, 0, 7),
        (24, 2, 64, 3, 2, 0, 8),
        (25, 2, 65, 3, 1, 0, 9),
        (26, 2, 66, 3, 5, 0, 10),
        (27, 2, 57, 4, 0, 0, 1),
        (28, 2, 56, 4, 5, 0, 2),
        (29, 2, 55, 4, 1, 0, 3),
        (30, 2, 54, 4, 2, 0, 4),
        (41, 2, 53, 4, 5, 0, 5),
        (42, 2, 52, 4, 5, 0, 6),
        (43, 2, 51, 4, 1, 0, 7),
        (44, 2, 50, 4, 3, 0, 8),
        (45, 2, 49, 4, 2, 0, 9),
        (46, 2, 17, 4, 2, 0, 10),
        (47, 3, 33, 5, 0, 0, 1),
        (48, 3, 34, 5, 2, 0, 2),
        (49, 3, 35, 5, 2, 0, 3),
        (50, 3, 36, 5, 4, 0, 4),
        (51, 3, 37, 5, 6, 1, 5),
        (52, 3, 38, 5, 6, 1, 6),
        (53, 3, 39, 5, 5, 0, 7),
        (54, 3, 40, 5, 2, 0, 8),
        (55, 3, 41, 5, 4, 0, 9),
        (56, 3, 25, 6, 0, 0, 1),
        (57, 3, 24, 6, 2, 0, 2),
        (58, 3, 23, 6, 5, 0, 3),
        (59, 3, 22, 6, 6, 0, 4),
        (60, 3, 21, 6, 6, 1, 5),
        (61, 3, 20, 6, 4, 1, 6),
        (62, 3, 19, 6, 2, 0, 7),
        (63, 3, 18, 6, 2, 0, 8),
        (64, 3, 17, 6, 2, 0, 9),
        (65, 5, 67, 22, 0, 0, 1),
        (66, 5, 69, 22, 3, 0, 2),
        (67, 5, 71, 22, 2, 0, 3),
        (68, 5, 73, 22, 1, 0, 4),
        (69, 5, 75, 22, 4, 0, 5),
        (70, 5, 77, 22, 3, 0, 6),
        (71, 5, 79, 22, 2, 0, 7),
        (72, 5, 81, 22, 1, 0, 8),
        (73, 5, 83, 22, 1, 0, 9),
        (75, 5, 84, 23, 0, 0, 1),
        (76, 5, 82, 23, 1, 0, 2),
        (77, 5, 80, 23, 2, 0, 3),
        (78, 5, 78, 23, 1, 0, 4),
        (79, 5, 76, 23, 4, 0, 5),
        (80, 5, 74, 23, 1, 0, 6),
        (81, 5, 72, 23, 2, 0, 7),
        (82, 5, 70, 23, 3, 0, 8),
        (83, 5, 68, 23, 3, 0, 9),
        (84, 4, 17, 93, 0, 0, 1),
        (85, 4, 26, 93, 4, 0, 2),
        (86, 4, 27, 93, 3, 0, 3),
        (87, 4, 28, 93, 2, 0, 4),
        (88, 4, 29, 93, 2, 0, 5),
        (89, 4, 30, 93, 3, 0, 6),
        (90, 4, 31, 93, 4, 0, 7),
        (91, 4, 32, 93, 4, 0, 8),
        (92, 4, 48, 94, 0, 0, 1),
        (93, 4, 47, 94, 4, 0, 2),
        (94, 4, 46, 94, 3, 0, 3),
        (95, 4, 45, 94, 2, 0, 4),
        (96, 4, 44, 94, 2, 0, 5),
        (97, 4, 43, 94, 3, 0, 6),
        (98, 4, 42, 94, 4, 0, 7),
        (99, 4, 33, 94, 4, 0, 8);

    INSERT INTO timetable (id, route_number, departure_time)
    VALUES
        (1, 1, '4:50'),
        (2, 1, '5:25'),
        (3, 1, '5:55'),
        (4, 1, '6:10'),
        (5, 1, '6:25'),
        (6, 1, '6:40'),
        (7, 1, '6:55'),
        (8, 1, '7:05'),
        (9, 1, '7:25'),
        (10, 1, '7:40'),
        (11, 1, '7:55'),
        (12, 1, '8:25'),
        (13, 1, '8:55'),
        (14, 1, '9:32'),
        (15, 1, '10:12'),
        (16, 1, '10:52'),
        (17, 1, '11:33'),
        (18, 1, '12:13'),
        (19, 1, '12:55'),
        (20, 1, '13:25'),
        (21, 1, '14:02'),
        (22, 1, '14:24'),
        (23, 1, '14:54'),
        (24, 1, '15:24'),
        (25, 1, '15:55'),
        (26, 1, '16:25'),
        (27, 1, '16:55'),
        (28, 1, '17:33'),
        (29, 1, '18:13'),
        (30, 1, '18:53'),
        (31, 1, '19:34'),
        (32, 1, '20:15'),
        (33, 1, '20:55'),
        (34, 1, '21:35'),
        (35, 1, '22:02'),
        (36, 2, '4:50'),
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
        (219, 6, '22:02');

`;

const initializeTables = () => {
    sql.query(connectionString, dropTables, (err) => {
        if (err) {
            console.error('Error dropping tables:', err);
        } else {
            console.log('Tables dropped successfully.');
            sql.query(connectionString, createLineTypesTable, (err) => {
                if (err) {
                    console.error('Error creating line_types table:', err);
                } else {
                    console.log('line_types table created successfully.');
                    sql.query(connectionString, createTransportStopsTable, (err) => {
                        if (err) {
                            console.error('Error creating transport_stops table:', err);
                        } else {
                            console.log('transport_stops table created successfully.');
                            sql.query(connectionString, createTransportLinesTable, (err) => {
                                if (err) {
                                    console.error('Error creating transport_lines table:', err);
                                } else {
                                    console.log('transport_lines table created successfully.');
                                    sql.query(connectionString, createRoutesTable, (err) => {
                                        if (err) {
                                            console.error('Error creating routes table:', err);
                                        } else {
                                            console.log('routes table created successfully.');
                                            sql.query(connectionString, createTimetableTable, (err) => {
                                                if (err) {
                                                    console.error('Error creating timetable table:', err);
                                                } else {
                                                    console.log('timetable table created successfully.');
                                                    sql.query(connectionString, insertExampleData, (err) => {
                                                        if (err) {
                                                            console.error('Error inserting data:', err);
                                                        } else {
                                                            console.log('Data inserted successfully.');
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