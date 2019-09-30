const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

mongoose.connect(process.env.DATABASE_URL, {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;
db.on('error', error => console.log('Error ocurred while connecting to DB: ', error));
db.once('open', () => console.log('Connected to the DB.'));

app.use(express.json());

// Setting up the routes
const subscribersRouter = require('./routes/subscribers');
const filesRouter = require('./routes/files');
app.use('/subscribers', subscribersRouter);
app.use('/files', filesRouter);

app.listen(process.env.PORT, () => console.log('Server Started at', process.env.PORT));