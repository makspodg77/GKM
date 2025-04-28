/**
 * @swagger
 * /api/lines:
 *   post:
 *     tags: [Transport Lines]
 *     summary: Add a new line
 *     description: Adds a new transport line
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - lineTypeId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the transport line
 *               lineTypeId:
 *                 type: integer
 *                 description: ID of the line type
 *     responses:
 *       201:
 *         description: Successfully added new line
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 line_type_name:
 *                   type: string
 *                 color:
 *                   type: string
 *       400:
 *         description: Bad request - invalid parameters
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, lineTypeId } = req.body;

    if (!name || typeof name !== "string") {
      throw new ValidationError(
        "name parameter is required and must be a string"
      );
    }

    if (!lineTypeId || isNaN(parseInt(lineTypeId))) {
      throw new ValidationError(
        "lineTypeId parameter is required and must be a number"
      );
    }

    const query = `INSERT INTO line (name, line_type_id) VALUES (@name, @lineTypeId)`;
    await executeQuery(query, { name, lineTypeId });

    const fetchQuery = `
      SELECT l.id, l.name, lt.nameSingular AS line_type_name, lt.color
      FROM line l
      JOIN line_type lt ON l.line_type_id = lt.id
      WHERE l.name = @name AND l.line_type_id = @lineTypeId
    `;

    const newLine = await executeQuery(fetchQuery, { name, lineTypeId });

    if (!newLine || newLine.length === 0) {
      throw new Error("Line was inserted but could not be retrieved");
    }

    res.status(201).json(newLine[0]);
  })
);

/**
 * @swagger
 * /api/lineTypes:
 *   post:
 *     tags: [Line Types]
 *     summary: Adds a new line type
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nameSingular
 *               - namePlural
 *               - color
 *             properties:
 *               nameSingular:
 *                 type: string
 *                 description: Name of the line type
 *               namePlural:
 *                 type: string
 *                 description: Name of the line type but plural
 *               color:
 *                 type: string
 *                 description: HEX color
 *     responses:
 *       201:
 *         description: Successfully added new line
 *       400:
 *         description: Bad request - invalid parameters
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { nameSingular, namePlural, color } = req.body;

    if (!nameSingular || typeof nameSingular !== "string") {
      throw new ValidationError(
        "nameSingular parameter is required and must be a string"
      );
    }

    if (!namePlural || typeof namePlural !== "string") {
      throw new ValidationError(
        "namePlural parameter is required and must be a string"
      );
    }

    if (!color || typeof color !== "string") {
      throw new ValidationError(
        "color parameter is required and must be a string"
      );
    }

    const query = `INSERT INTO line_type (nameSingular, namePlural, color) VALUES (@nameSingular, @namePlural, @color)`;

    await executeQuery(query, {
      nameSingular,
      namePlural,
      color,
    });

    res.status(201).json();
  })
);

/**
 * @swagger
 * /api/lineTypes:
 *   put:
 *     tags: [Line Types]
 *     summary: updates a new line type
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - nameSingular
 *               - namePlural
 *               - color
 *             properties:
 *               id:
 *                 type: integer
 *                 description: Id of the line type to update
 *               nameSingular:
 *                 type: string
 *                 description: Name of the line type
 *               namePlural:
 *                 type: string
 *                 description: Name of the line type but plural
 *               color:
 *                 type: string
 *                 description: HEX color
 *     responses:
 *       201:
 *         description: Successfully updated new line
 *       400:
 *         description: Bad request - invalid parameters
 *       500:
 *         description: Server error
 */
router.put(
  "/",
  asyncHandler(async (req, res) => {
    const { id, nameSingular, namePlural, color } = req.body;

    if (!nameSingular || typeof nameSingular !== "string") {
      throw new ValidationError(
        "nameSingular parameter is required and must be a string"
      );
    }

    if (!namePlural || typeof namePlural !== "string") {
      throw new ValidationError(
        "namePlural parameter is required and must be a string"
      );
    }

    if (!color || typeof color !== "string") {
      throw new ValidationError(
        "color parameter is required and must be a string"
      );
    }

    const query = `UPDATE line_types SET nameSingular = @nameSingular, namePlural = @namePlural, color = @color WHERE id = @id `;

    await executeQuery(query, {
      id,
      nameSingular,
      namePlural,
      color,
    });

    res.status(201).json();
  })
);

const routeValidation = async (line_id, is_circular, is_night) => {
  if (!line_id || isNaN(parseInt(line_id))) {
    throw new ValidationError("Line id parameter is required");
  }

  const lineExists = await executeQuery("SELECT 1 FROM line WHERE id = @id", {
    id: line_id,
  });
  if (!lineExists.length) {
    throw new ValidationError(`Line with ID ${line_id} does not exist`);
  }

  if (typeof is_circular !== "boolean" && ![0, 1].includes(is_circular)) {
    throw new ValidationError(
      "is_circular must be a boolean value (true/false or 0/1)"
    );
  }

  if (typeof is_night !== "boolean" && ![0, 1].includes(is_night)) {
    throw new ValidationError(
      "is_night must be a boolean value (true/false or 0/1)"
    );
  }
};

/**
 * @swagger
 * /api/routes/:
 *   post:
 *     tags: [Transport Routes]
 *     summary: Add a new route
 *     description: Adds a new route for a line
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - line_id
 *               - is_circular
 *               - is_night
 *             properties:
 *               line_id:
 *                 type: integer
 *                 description: ID of the line the route will belong to
 *               is_circular:
 *                 type: boolean
 *                 description: binary value if a lines route will be a loop
 *               is_night:
 *                 type: boolean
 *                 description: binary value if the line departures only at night
 *     responses:
 *       201:
 *         description: Successfully added the route
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 line_id:
 *                   type: integer
 *                 is_circular:
 *                   type: boolean
 *                 is_night:
 *                   type: boolean
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { line_id, is_circular, is_night } = req.body;

    try {
      await routeValidation(line_id, is_circular, is_night);

      const query = `INSERT INTO route(line_id, is_circular, is_night) VALUES(@line_id, @is_circular, @is_night)
      SELECT SCOPE_IDENTITY() AS id`;

      const result = await executeQuery(query, {
        line_id,
        is_circular,
        is_night,
      });

      const newRoute = await executeQuery(
        `SELECT * FROM route where id = @id`,
        {
          id: result[0].id,
        }
      );

      res.status(201).json(newRoute[0]);
    } catch (error) {
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/routes/{id}:
 *   put:
 *     tags: [Transport Routes]
 *     summary: Update a route
 *     description: Updates a route
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the full route to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - line_id
 *               - is_circular
 *               - is_night
 *             properties:
 *               line_id:
 *                 type: integer
 *                 description: ID of the line the route will belong to
 *               is_circular:
 *                 type: boolean
 *                 description: binary value if a lines route will be a loop
 *               is_night:
 *                 type: boolean
 *                 description: binary value if the line departures only at night
 *     responses:
 *       200:
 *         description: Successfully updated the route
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 line_id:
 *                   type: integer
 *                 is_circular:
 *                   type: boolean
 *                 is_night:
 *                   type: boolean
 *       404:
 *         description: Departure route not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { line_id, is_circular, is_night } = req.body;

    fullRouteValidation(line_id, is_circular, is_night);

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError("ID parameter is required");
    }

    const routeExists = await executeQuery(
      `SELECT 1 FROM route WHERE id = @id`,
      { id }
    );
    if (!routeExists.length) {
      throw new NotFoundError(`Route with id = ${id} does not exist`);
    }

    const query = `UPDATE route SET line_id = @line_id, is_night = @is_night, is_circular = @is_circular WHERE id = @id;`;

    await executeQuery(query, {
      line_id,
      is_circular,
      is_night,
      id,
    });

    const updatedRoute = await executeQuery(
      `SELECT * FROM route WHERE id = @id;`,
      { id }
    );

    res.status(200).json(updatedRoute[0]);
  })
);

const fullRouteValidation = async (
  stop_id,
  stop_type,
  travel_time,
  is_on_request,
  stop_number,
  route_id
) => {
  if (isNaN(parseInt(travel_time)) || travel_time < 0) {
    throw new ValidationError("Travel time parameter is required");
  }

  if (!stop_id || isNaN(parseInt(stop_id))) {
    throw new ValidationError("Stop id parameter is required");
  }

  if (!stop_number || isNaN(parseInt(stop_number)) || stop_number <= 0) {
    throw new ValidationError("Stop number parameter is required");
  }

  if (!route_id || isNaN(parseInt(route_id))) {
    throw new ValidationError("Route id parameter is required");
  }

  const routeExists = await executeQuery("SELECT 1 FROM route WHERE id = @id", {
    id: route_id,
  });
  if (!routeExists.length) {
    throw new ValidationError(`Route with ID ${route_id} does not exist`);
  }

  const stopExists = await executeQuery("SELECT 1 FROM stop WHERE id = @id", {
    id: stop_id,
  });
  if (!stopExists.length) {
    throw new ValidationError(`Stop with ID ${stop_id} does not exist`);
  }

  const stopNumberExists = await executeQuery(
    "SELECT 1 FROM full_route WHERE route_id = @route_id AND stop_number = @stop_number",
    {
      route_id,
      stop_number,
    }
  );
  if (stopNumberExists.length) {
    throw new ValidationError(
      `Stop number with number ${stop_number} already exists`
    );
  }

  const typeExists = await executeQuery(
    "SELECT 1 FROM stop_type WHERE id = @id",
    {
      id: stop_type,
    }
  );
  if (!typeExists.length) {
    throw new ValidationError(`Stop type with ID ${stop_type} does not exist`);
  }

  if (typeof is_on_request !== "boolean" && ![0, 1].includes(is_on_request)) {
    throw new ValidationError(
      "is_on_request must be a boolean value (true/false or 0/1)"
    );
  }
};
/**
 * @swagger
 * /api/routes/full-route:
 *   post:
 *     tags: [Transport Routes]
 *     summary: Add a new route
 *     description: Adds a new route for a line
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stop_id
 *               - stop_type
 *               - travel_time
 *               - is_on_request
 *               - stop_number
 *               - route_id
 *             properties:
 *               stop_id:
 *                 type: integer
 *                 description: ID of the stop
 *               stop_type:
 *                 type: integer
 *                 description: type of the stop
 *               travel_time:
 *                 type: integer
 *                 description: time it takes to get to the stop from the last one in minutes
 *               is_on_request:
 *                 type: boolean
 *                 description: boolean value if a stop is on request
 *               stop_number:
 *                 type: integer
 *                 description: which stop in order is this
 *               route_id:
 *                 type: integer
 *                 description: ID of the route this full route will elong to
 *     responses:
 *       201:
 *         description: Successfully updated the full route
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 stop_id:
 *                   type: integer
 *                 stop_type:
 *                   type: integer
 *                 travel_time:
 *                   type: integer
 *                 is_on_request:
 *                   type: boolean
 *                 stop_number:
 *                   type: integer
 *                 route_id:
 *                   type: integer
 *       500:
 *         description: Server error
 */
router.post(
  "/full-route",
  asyncHandler(async (req, res) => {
    const {
      stop_id,
      stop_type,
      travel_time,
      is_on_request,
      stop_number,
      route_id,
    } = req.body;
    try {
      await fullRouteValidation(
        stop_id,
        stop_type,
        travel_time,
        is_on_request,
        stop_number,
        route_id
      );

      const query = `INSERT INTO full_route(stop_id, stop_type, travel_time, is_on_request, stop_number, route_id) VALUES(@stop_id, @stop_type, @travel_time, @is_on_request, @stop_number, @route_id);
      SELECT SCOPE_IDENTITY() AS id;`;

      const result = await executeQuery(query, {
        stop_id,
        stop_type,
        travel_time,
        is_on_request,
        stop_number,
        route_id,
      });

      const addedFullRoute = await executeQuery(
        `SELECT * FROM full_route WHERE id = @id`,
        { id: result[0].id }
      );

      res.status(201).json(addedFullRoute[0]);
    } catch (error) {
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/routes/full-route/{id}:
 *   put:
 *     tags: [Transport Routes]
 *     summary: Update a full route
 *     description: Updates a full route
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the full route to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stop_id
 *               - stop_type
 *               - travel_time
 *               - is_on_request
 *               - stop_number
 *               - route_id
 *             properties:
 *               stop_id:
 *                 type: integer
 *                 description: ID of the stop
 *               stop_type:
 *                 type: integer
 *                 description: type of the stop
 *               travel_time:
 *                 type: integer
 *                 description: time it takes to get to the stop from the last one in minutes
 *               is_on_request:
 *                 type: boolean
 *                 description: boolean value if a stop is on request
 *               stop_number:
 *                 type: integer
 *                 description: which stop in order is this
 *               route_id:
 *                 type: integer
 *                 description: ID of the route this full route will elong to
 *     responses:
 *       200:
 *         description: Successfully updated the additional stop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 stop_id:
 *                   type: integer
 *                 stop_type:
 *                   type: integer
 *                 travel_time:
 *                   type: integer
 *                 is_on_request:
 *                   type: boolean
 *                 stop_number:
 *                   type: integer
 *                 route_id:
 *                   type: integer
 *       404:
 *         description: Departure route not found
 *       500:
 *         description: Server error
 */
router.put(
  "/full-route/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      stop_id,
      stop_type,
      travel_time,
      is_on_request,
      stop_number,
      route_id,
    } = req.body;

    fullRouteValidation(
      stop_id,
      stop_type,
      travel_time,
      is_on_request,
      stop_number,
      route_id
    );

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError("ID parameter is required");
    }

    const fullRouteExists = await executeQuery(
      `SELECT 1 FROM full_route WHERE id = @id`,
      { id }
    );
    if (!fullRouteExists.length) {
      throw new NotFoundError(`Full route with id = ${id} does not exist`);
    }

    const query = `UPDATE full_route SET stop_id = @stop_id, stop_type = @stop_type, travel_time = @travel_time, is_on_request = @is_on_request, stop_number = @stop_number, route_id = @route_id WHERE id = @id;`;

    await executeQuery(query, {
      stop_id,
      stop_type,
      travel_time,
      is_on_request,
      stop_number,
      route_id,
      id,
    });

    const updatedFullRoute = await executeQuery(
      `SELECT * FROM full_route WHERE id = @id;`,
      { id }
    );

    res.status(200).json(updatedFullRoute[0]);
  })
);
/**
 * @swagger
 * /api/routes/full-routes/batch:
 *   post:
 *     tags: [Transport Routes]
 *     summary: Add multiple full routes in a batch
 *     description: Creates multiple full routes in a single transaction. If any route validation fails, the entire batch fails.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - stop_id
 *                 - stop_type
 *                 - travel_time
 *                 - is_on_request
 *                 - stop_number
 *                 - route_id
 *               properties:
 *                 stop_id:
 *                   type: integer
 *                   description: ID of the stop
 *                 stop_type:
 *                   type: integer
 *                   description: type of the stop
 *                 travel_time:
 *                   type: integer
 *                   description: time it takes to get to the stop from the last one in minutes
 *                 is_on_request:
 *                   type: boolean
 *                   description: boolean value if a stop is on request
 *                 stop_number:
 *                   type: integer
 *                   description: which stop in order is this
 *                 route_id:
 *                   type: integer
 *                   description: ID of the route this full route will belong to
 *     responses:
 *       201:
 *         description: Successfully created all full routes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   stop_id:
 *                     type: integer
 *                   stop_type:
 *                     type: integer
 *                   travel_time:
 *                     type: integer
 *                   is_on_request:
 *                     type: boolean
 *                   stop_number:
 *                     type: integer
 *                   route_id:
 *                     type: integer
 *       400:
 *         description: Validation error in one or more routes
 *       500:
 *         description: Server error
 */
router.post(
  "/full-routes/batch",
  asyncHandler(async (req, res) => {
    const routes = req.body;
    const results = [];
    let transaction;

    try {
      transaction = await beginTransaction();

      for (const route of routes) {
        const {
          stop_id,
          stop_type,
          travel_time,
          is_on_request,
          stop_number,
          route_id,
        } = route;

        await fullRouteValidation(
          stop_id,
          stop_type,
          travel_time,
          is_on_request,
          stop_number,
          route_id
        );

        const result = await executeQuery(
          `INSERT INTO full_route(
            stop_id, stop_type, travel_time, is_on_request, stop_number, route_id
          ) VALUES(
            @stop_id, @stop_type, @travel_time, @is_on_request, @stop_number, @route_id
          );
          SELECT SCOPE_IDENTITY() AS id;`,
          {
            stop_id,
            stop_type,
            travel_time,
            is_on_request,
            stop_number,
            route_id,
          },
          transaction
        );

        const fullRoute = await executeQuery(
          `SELECT * FROM full_route WHERE id = @id`,
          { id: result[0].id },
          transaction
        );

        results.push(fullRoute[0]);
      }

      await commitTransaction(transaction);
      res.status(201).json(results);
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/routes/full-routes/batch:
 *   put:
 *     tags: [Transport Routes]
 *     summary: Update multiple full routes in a batch
 *     description: Updates multiple existing full routes in a single transaction. If any validation fails, the entire batch fails.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - id
 *                 - stop_id
 *                 - stop_type
 *                 - travel_time
 *                 - is_on_request
 *                 - stop_number
 *                 - route_id
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: ID of the full route to update
 *                 stop_id:
 *                   type: integer
 *                   description: ID of the stop
 *                 stop_type:
 *                   type: integer
 *                   description: type of the stop
 *                 travel_time:
 *                   type: integer
 *                   description: time it takes to get to the stop from the last one in minutes
 *                 is_on_request:
 *                   type: boolean
 *                   description: boolean value if a stop is on request
 *                 stop_number:
 *                   type: integer
 *                   description: which stop in order is this
 *                 route_id:
 *                   type: integer
 *                   description: ID of the route this full route belongs to
 *     responses:
 *       200:
 *         description: Successfully updated all full routes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   stop_id:
 *                     type: integer
 *                   stop_type:
 *                     type: integer
 *                   travel_time:
 *                     type: integer
 *                   is_on_request:
 *                     type: boolean
 *                   stop_number:
 *                     type: integer
 *                   route_id:
 *                     type: integer
 *       400:
 *         description: Validation error in one or more routes
 *       404:
 *         description: One or more routes not found
 *       500:
 *         description: Server error
 */
router.put(
  "/full-routes/batch",
  asyncHandler(async (req, res) => {
    const routes = req.body;
    const results = [];
    let transaction;

    try {
      transaction = await beginTransaction();

      for (const route of routes) {
        const {
          id,
          stop_id,
          stop_type,
          travel_time,
          is_on_request,
          stop_number,
          route_id,
        } = route;

        if (!id || isNaN(parseInt(id))) {
          throw new ValidationError("ID parameter is required for each route");
        }

        const fullRouteExists = await executeQuery(
          `SELECT 1 FROM full_route WHERE id = @id`,
          { id },
          transaction
        );
        if (!fullRouteExists.length) {
          throw new NotFoundError(`Full route with id = ${id} does not exist`);
        }

        await fullRouteValidation(
          stop_id,
          stop_type,
          travel_time,
          is_on_request,
          stop_number,
          route_id
        );

        await executeQuery(
          `UPDATE full_route SET 
            stop_id = @stop_id,
            stop_type = @stop_type,
            travel_time = @travel_time,
            is_on_request = @is_on_request,
            stop_number = @stop_number,
            route_id = @route_id
          WHERE id = @id;`,
          {
            id,
            stop_id,
            stop_type,
            travel_time,
            is_on_request,
            stop_number,
            route_id,
          },
          transaction
        );

        const fullRoute = await executeQuery(
          `SELECT * FROM full_route WHERE id = @id`,
          { id },
          transaction
        );

        results.push(fullRoute[0]);
      }

      await commitTransaction(transaction);
      res.status(200).json(results);
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      throw error;
    }
  })
);

const departureRouteValidation = async (signature, color, route_id) => {
  if (!route_id || isNaN(parseInt(route_id))) {
    throw new ValidationError("Route id parameter is required");
  }

  if (signature && signature.length > 255) {
    throw new ValidationError("Signature cannot exceed 255 characters");
  }

  if (color && !color.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) {
    throw new ValidationError("Color must be a valid hex color code");
  }
  const routeExists = await executeQuery("SELECT 1 FROM route WHERE id = @id", {
    id: route_id,
  });
  if (!routeExists.length) {
    throw new ValidationError(`Route with ID ${route_id} does not exist`);
  }
};
/**
 * @swagger
 * /api/routes/departure-route:
 *   post:
 *     tags: [Transport Routes]
 *     summary: Add a new departure route
 *     description: Adds a new departure route for a route
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - route_id
 *             properties:
 *               signature:
 *                 type: string
 *                 description: how the route will be diffrentiated
 *               color:
 *                 type: string
 *                 description: color of this particular route
 *               route_id:
 *                 type: integer
 *                 description: ID of the route this departure route will belong to
 *     responses:
 *       201:
 *         description: Successfully added the departure route
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 signature:
 *                   type: string
 *                 color:
 *                   type: string
 *                 route_id:
 *                   type: integer
 *       500:
 *         description: Server error
 */
router.post(
  "/departure-route",
  asyncHandler(async (req, res) => {
    const { signature, color, route_id } = req.body;

    departureRouteValidation(signature, color, route_id);

    let fields = ["route_id"];
    let values = ["@route_id"];

    if (signature) {
      fields.push("signature");
      values.push("@signature");
    }

    if (color) {
      fields.push("color");
      values.push("@color");
    }

    const query = `INSERT INTO departure_route(${fields.join(
      ", "
    )}) VALUES(${values.join(", ")});
    SELECT SCOPE_IDENTITY() AS id;`;

    const result = await executeQuery(query, { signature, color, route_id });

    const addedDepartureRoute = await executeQuery(
      `SELECT * FROM departure_route WHERE id = @id`,
      { id: result[0].id }
    );

    res.status(201).json(addedDepartureRoute[0]);
  })
);

/**
 * @swagger
 * /api/routes/departure-route/{id}:
 *   put:
 *     tags: [Transport Routes]
 *     summary: Update a departure route
 *     description: Updates a departure route
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the departure route to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - route_id
 *             properties:
 *               signature:
 *                 type: string
 *                 description: how the route will be diffrentiated
 *               color:
 *                 type: string
 *                 description: color of this particular route
 *               route_id:
 *                 type: integer
 *                 description: ID of the route this departure route will belong to
 *     responses:
 *       200:
 *         description: Successfully updated the additional stop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 signature:
 *                   type: string
 *                 color:
 *                   type: string
 *                 route_id:
 *                   type: integer
 *       404:
 *         description: Departure route not found
 *       500:
 *         description: Server error
 */
router.put(
  "/departure-route/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { signature, color, route_id } = req.body;

    departureRouteValidation(signature, color, route_id);

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError("ID parameter is required");
    }

    const departureRouteExists = await executeQuery(
      `SELECT 1 FROM departure_route WHERE id = @id`,
      { id }
    );
    if (!departureRouteExists.length) {
      throw new NotFoundError(`Departure route with id = ${id} does not exist`);
    }

    let fields = ["route_id = @route_id"];

    if (signature) {
      fields.push("signature = @signature");
    }

    if (color) {
      fields.push("color = @color");
    }

    const query = `UPDATE departure_route SET ${fields.join(
      ", "
    )} WHERE id = @id;`;

    await executeQuery(query, { signature, color, id, route_id });

    const updatedDepartureRoute = await executeQuery(
      `SELECT * FROM departure_route WHERE id = @id;`,
      { id }
    );

    res.status(200).json(updatedDepartureRoute[0]);
  })
);

const additionalStopValidation = async (route_id, stop_id) => {
  if (!route_id || isNaN(parseInt(route_id))) {
    throw new ValidationError("Route id parameter is required");
  }

  if (!stop_id || isNaN(parseInt(stop_id))) {
    throw new ValidationError("Stop id parameter is required");
  }

  const routeExists = await executeQuery(
    "SELECT 1 FROM departure_route WHERE id = @id",
    {
      id: route_id,
    }
  );
  if (!routeExists.length) {
    throw new ValidationError(
      `Departure route with ID ${route_id} does not exist`
    );
  }

  const stopExists = await executeQuery("SELECT 1 FROM stop WHERE id = @id", {
    id: stop_id,
  });
  if (!stopExists.length) {
    throw new ValidationError(`Stop with ID ${stop_id} does not exist`);
  }

  const fullRouteExists = await executeQuery(
    `SELECT * FROM full_route 
    JOIN stop_type ON full_route.stop_type = stop_type.id 
    WHERE route_id = @route_id AND stop_id = @stop_id;`,
    { route_id: routeExists[0].route_id, stop_id }
  );
  if (!fullRouteExists.length) {
    throw new ValidationError(
      `Stop with ID ${stop_id} does not exist in the full route`
    );
  }

  if (!fullRouteExists[0].is_optional) {
    throw new ValidationError(
      `Stop with ID ${stop_id} is not designated as optional and cannot be added as an additional stop`
    );
  }
};

/**
 * @swagger
 * /api/routes/additional-stop:
 *   post:
 *     tags: [Transport Routes]
 *     summary: Add a new additional stop
 *     description: Adds a new additional stop to a route
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - route_id
 *               - stop_number
 *             properties:
 *               stop_number:
 *                 type: integer
 *                 description: ID of the stop the route will stop at
 *               route_id:
 *                 type: integer
 *                 description: ID of the route this departure route will belong to
 *     responses:
 *       201:
 *         description: Successfully added the additional stop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 stop_number:
 *                   type: integer
 *                 route_id:
 *                   type: integer
 *       500:
 *         description: Server error
 */
router.post(
  "/additional-stop",
  asyncHandler(async (req, res) => {
    const { route_id, stop_number } = req.body;
    try {
      additionalStopValidation(route_id, stop_number);

      const query = `INSERT INTO additional_stop(route_id, stop_number) VALUES(@route_id, @stop_number);
      SELECT SCOPE_IDENTITY() AS id;`;

      const result = await executeQuery(query, { route_id, stop_number });

      const addedAdditionalStop = await executeQuery(
        `SELECT * FROM additional_stop WHERE id = @id;`,
        { id: result[0].id }
      );

      res.status(201).json(addedAdditionalStop[0]);
    } catch (error) {
      throw error;
    }
  })
);
/**
 * @swagger
 * /api/routes/additional-stop/{id}:
 *   put:
 *     tags: [Transport Routes]
 *     summary: Update an additional stop
 *     description: Updates an additional stop in a route
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the additional stop to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - route_id
 *               - stop_number
 *             properties:
 *               stop_number:
 *                 type: integer
 *                 description: ID of the stop the route will stop at
 *               route_id:
 *                 type: integer
 *                 description: ID of the route this departure route will belong to
 *     responses:
 *       200:
 *         description: Successfully updated the additional stop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 stop_number:
 *                   type: integer
 *                 route_id:
 *                   type: integer
 *       404:
 *         description: Additional stop not found
 *       500:
 *         description: Server error
 */
router.put(
  "/additional-stop/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { route_id, stop_number } = req.body;
    try {
      await additionalStopValidation(route_id, stop_number);

      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError("ID parameter is required");
      }

      const additionalStopExists = await executeQuery(
        `SELECT 1 FROM additional_stop WHERE id = @id`,
        { id }
      );
      if (!additionalStopExists.length) {
        throw new NotFoundError(
          `Additional stop with id = ${id} does not exist`
        );
      }

      const query = `UPDATE additional_stop SET route_id = @route_id, stop_number = @stop_number WHERE id = @id;`;

      await executeQuery(query, { route_id, stop_number, id });

      const updatedAdditionalStop = await executeQuery(
        `SELECT * FROM additional_stop WHERE id = @id;`,
        { id }
      );

      res.status(200).json(updatedAdditionalStop[0]);
    } catch (error) {
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/stops/stop-groups:
 *   post:
 *     tags: [Transport Stops]
 *     summary: Add a new stop group
 *     description: Adds a new stop group using a name parameter
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: name of the stop group
 *     responses:
 *       201:
 *         description: Successfully added the stop group
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.post(
  "/stop-groups",
  asyncHandler(async (req, res) => {
    const { name } = req.body;

    if (!name || name.length === 0) {
      throw new ValidationError(`Name parameter is required`);
    }

    const query = `INSERT INTO stop_group (name) VALUES (@name); SELECT SCOPE_IDENTITY() AS id;`;
    const result = await executeQuery(query, { name });

    const newGroup = await executeQuery(
      `SELECT * FROM stop_group WHERE id = @id`,
      { id: result[0].id }
    );

    res.status(201).json(newGroup[0]);
  })
);

/**
 * @swagger
 * /api/stops/:
 *   post:
 *     tags: [Transport Stops]
 *     summary: Add a new stop
 *     description: Adds a new stop using a stop_group_id, map and street parameters
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stop_group_id
 *               - map
 *               - street
 *             properties:
 *               stop_group_id:
 *                 type: integer
 *                 description: id of the group stop the stop will belong to
 *               map:
 *                 type: string
 *                 description: the embedded link to a map
 *               street:
 *                 type: string
 *                 description: the name of the street
 *     responses:
 *       201:
 *         description: Successfully added the stop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 stop_group_id:
 *                   type: integer
 *                 map:
 *                   type: string
 *                 street:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { stop_group_id, map, street } = req.body;

    if (!stop_group_id || isNaN(parseInt(stop_group_id))) {
      throw new ValidationError(`stop_group_id parameter is required`);
    }

    if (!map || map.length === 0) {
      throw new ValidationError(`Map parameter is required`);
    }

    if (!street || street.length === 0) {
      throw new ValidationError(`Street parameter is required`);
    }

    const query = `INSERT INTO stop (stop_group_id, map, street) VALUES (@stop_group_id, @map, @street); SELECT SCOPE_IDENTITY() AS id;`;
    const result = await executeQuery(query, {
      stop_group_id,
      map,
      street,
    });

    const newStop = await executeQuery(`SELECT * FROM stop WHERE id = @id`, {
      id: result[0].id,
    });

    res.status(201).json(newStop[0]);
  })
);

/**
 * @swagger
 * /api/stops/{id}:
 *   put:
 *     tags: [Transport Stops]
 *     summary: Update a stop group
 *     description: Updates name of a given stop group
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the stop group to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stop_group_id
 *               - map
 *               - street
 *             properties:
 *               stop_group_id:
 *                 type: integer
 *                 description: ID of the stop group the stop belongs to
 *               map:
 *                 type: string
 *                 description: link to the map
 *               street:
 *                 type: string
 *                 description: name of the street
 *     responses:
 *       200:
 *         description: Successfully updated the stop group
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 stop_group_id:
 *                   type: integer
 *                 map:
 *                   type: string
 *                 street:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { stop_group_id, map, street } = req.body;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError(`ID parameter is required`);
    }

    if (!stop_group_id || isNaN(parseInt(stop_group_id))) {
      throw new ValidationError(`stop_group_id parameter is required`);
    }

    if (!map || map.length === 0) {
      throw new ValidationError(`Map parameter is required`);
    }

    if (!street || street.length === 0) {
      throw new ValidationError(`Street parameter is required`);
    }

    const query = `UPDATE stop SET stop_group_id = @stop_group_id, map = @map, street = @street WHERE id = @id`;

    const result = await executeQuery(query, {
      id,
      stop_group_id,
      street,
      map,
    });

    if (!result.rowsAffected) {
      throw new NotFoundError(`Stop with id=${id} was not found`);
    }

    const updatedStop = await executeQuery(
      `SELECT * FROM stop WHERE id = @id`,
      {
        id,
      }
    );

    res.status(200).json(updatedStop[0]);
  })
);

/**
 * @swagger
 * /api/stops/stop-groups/{id}:
 *   put:
 *     tags: [Transport Stops]
 *     summary: Update a stop group
 *     description: Updates a given stop group
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the stop to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: new name of the stop group
 *     responses:
 *       200:
 *         description: Successfully updated the stop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.put(
  "/stop-groups/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError(`ID parameter is required`);
    }

    if (!name || name.length === 0) {
      throw new ValidationError(`Name parameter is required`);
    }

    const query = `UPDATE stop_group SET name = @name WHERE id = @id`;

    const result = await executeQuery(query, {
      id,
      name,
    });

    if (!result.rowsAffected) {
      throw new NotFoundError(`Stop group with id=${id} was not found`);
    }

    const updatedStopGroup = await executeQuery(
      `SELECT * FROM stop_group WHERE id = @id`,
      {
        id,
      }
    );

    res.status(200).json(updatedStopGroup[0]);
  })
);

const timetableValidation = async (route_id, departure_time) => {
  if (!route_id || isNaN(parseInt(route_id))) {
    throw new ValidationError(`Route id parameter is required`);
  }

  const routeExists = await executeQuery(
    `SELECT 1 FROM departure_route where id = @route_id`,
    { route_id }
  );
  if (!routeExists.length) {
    throw new NotFoundError(
      `Departure route with ID = ${route_id} does not exist`
    );
  }

  if (!departure_time) {
    throw new ValidationError("Departure time parameter is required");
  }

  const timeFormatRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  if (!timeFormatRegex.test(departure_time)) {
    throw new ValidationError(
      "Departure time must be in format HH:MM (e.g., 21:37)"
    );
  }
};

/**
 * @swagger
 * /api/timetable/:
 *   post:
 *     tags: [Timetable]
 *     summary: Adds a new departure
 *     description: Adds a new departure for a specific route
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - route_id
 *               - departure_time
 *             properties:
 *               departure_time:
 *                 type: string
 *                 description: time of the departure
 *               route_id:
 *                 type: integer
 *                 description: ID of the departure route this timetable departure will belong to
 *     responses:
 *       201:
 *         description: Successfully added the departure to timetable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 departure_time:
 *                   type: string
 *                 route_id:
 *                   type: integer
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { route_id, departure_time } = req.body;
    try {
      await timetableValidation(route_id, departure_time);

      const query = `INSERT INTO timetable(route_id, departure_time) VALUES(@route_id, @departure_time);
                     SELECT SCOPE_IDENTITY() AS id;`;

      const result = await executeQuery(query, { route_id, departure_time });

      res.status(201).json({ id: result[0].id, route_id, departure_time });
    } catch (error) {
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/timetable/batch:
 *   post:
 *     tags: [Timetable]
 *     summary: Add multiple departures in a batch
 *     description: Creates multiple departures in a single transaction
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - route_id
 *                 - departure_time
 *               properties:
 *                 departure_time:
 *                   type: string
 *                   description: Time of the departure in HH:MM format
 *                 route_id:
 *                   type: integer
 *                   description: ID of the departure route
 *     responses:
 *       201:
 *         description: Successfully added departures
 */
router.post(
  "/batch",
  asyncHandler(async (req, res) => {
    const departures = req.body;
    const results = [];
    let transaction;

    try {
      transaction = await beginTransaction();

      for (const departure of departures) {
        const { route_id, departure_time } = departure;

        await timetableValidation(route_id, departure_time);

        const result = await executeQuery(
          `INSERT INTO timetable(route_id, departure_time) 
           VALUES(@route_id, @departure_time);
           SELECT SCOPE_IDENTITY() AS id;`,
          { route_id, departure_time },
          transaction
        );

        results.push({ id: result[0].id, route_id, departure_time });
      }

      await commitTransaction(transaction);
      res.status(201).json(results);
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/timetable/batch:
 *   delete:
 *     tags: [Timetable]
 *     summary: Deletes multiple departures in a batch
 *     description: Deletes multiple departures in a single transaction
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - id
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: ID of the timetable entry to delete
 *     responses:
 *       200:
 *         description: Successfully deleted departures
 *       404:
 *         description: One or more timetable entries not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/batch",
  asyncHandler(async (req, res) => {
    const departures = req.body;
    const results = [];
    let transaction;

    try {
      transaction = await beginTransaction();

      const ids = departures.map((d) => d.id);
      const existingIds = await executeQuery(
        `SELECT id FROM timetable WHERE id IN (${ids.join(",")})`,
        {},
        transaction
      );

      if (existingIds.length !== ids.length) {
        const foundIds = existingIds.map((r) => r.id);
        const missingIds = ids.filter((id) => !foundIds.includes(id));
        throw new NotFoundError(
          `Timetable entries not found: ${missingIds.join(", ")}`
        );
      }

      for (const departure of departures) {
        const { id } = departure;

        await executeQuery(
          `DELETE FROM timetable WHERE id = @id;`,
          { id },
          transaction
        );

        results.push({ id });
      }

      await commitTransaction(transaction);
      res.status(200).json(results);
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      throw error;
    }
  })
);
