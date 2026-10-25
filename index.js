require('dotenv').config();
const { getDatabaseConnection } = require('./db/db.connect');
getDatabaseConnection();

const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());

const cors = require('cors');

const corsOptions = {
    origin: '*',
    credentials: true,
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

const projectModel = require('./models/project.models');
const tagModel = require('./models/tag.models');
const taskModel = require('./models/task.models');
const teamModel = require('./models/team.models');
const userModel = require('./models/user.models');

// Adding a New Task using Mongoose helper function 

const addNewTask = async (taskData) => {
    try {
        const newTask = new taskModel(taskData);
        const savedNewTask = await newTask.save();
        return savedNewTask;
    } catch (error) {
        console.error('Error', error.message);
        throw error;
    }
}

// Adding a New task using Express API

app.post('/tasks', async (req, res) => {
    try {
        const task = await addNewTask(req.body);
        res.status(201).json({ message: 'New Task Added', task });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const message = Object.values(error.errors).map((err) => {
                if (err.kind === 'required') {
                    return `${err.path} is required`;
                }
                return `'${err.path}' ${err.message.toLowerCase()}`;
            });
            res.status(400).json({ error: `invalid input : ${message.join(', ')}` });
        } else if (error.code === '11000') {
            res.status(409).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('Server is Running on PORT', PORT);
});