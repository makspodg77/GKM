const express = require('express');
const cors = require('cors');

const timetableRouter = require('./routes/timetable');
const routesRouter = require('./routes/routes');
const transportLinesRouter = require('./routes/transportLines');


const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

app.use('/api/timetable', timetableRouter);
app.use('/api/routes', routesRouter);
app.use('/api/transportLines', transportLinesRouter);


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
