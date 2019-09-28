const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

mongoose.connect(process.env.DATABASE_URL, {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;
db.on('error', error => console.log('Error ocurred: ', error));
db.once('open', () => console.log('Connected to the DB.'));

app.use(express.json());

// Setting up the routes
const subscribersRouter = require('./routes/subscribers');
app.use('/subscribers', subscribersRouter);

app.listen(3030, () => console.log('server started'));