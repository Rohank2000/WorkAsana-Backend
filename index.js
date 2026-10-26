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
        return res.status(201).json({ message: 'New Task Added', task });
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

// Get Task data using mongoose

const getAllTaskData = async (taskQueryParameter) => {
    try {
        const { owner, tags, ...restTaskFields } = taskQueryParameter;
        const nonEmptyTaskFields = Object.fromEntries(Object.entries(restTaskFields).filter(([Key, value]) => value !== undefined && value !== ""));

        if (owner) {
            nonEmptyTaskFields.owner = { $in: owner.split(", ") };
        }

        if (tags) {
            nonEmptyTaskFields.tags = { $in: tags.split(", ") };
        }

        const allTaskData = await taskModel.find(nonEmptyTaskFields).populate('project owner tags');
        return allTaskData;
    } catch (error) {
        console.log('Error', error.message);
        throw error;
    }
}

// Get Task Data using express API

app.get('/tasks', async (req, res) => {
    try {
        const allowedQueryFields = ['team', 'owner', 'tags', 'project', 'status'];

        const providedQueryKeys = Objects.keys(req.query);

        const invalidKeys = providedQueryKeys.filter((key) => !allowedQueryFields.includes(key));

        if (invalidKeys > 0) {
            return res.status(400).json({ message: `Invalid Query Operators - ${invalidKeys.join(', ')}` });
        }

        const task = await getAllTaskData(req.query);

        if (!task || task.length === 0) {
            return res.status(404).json({ message: 'No Task Data Found Matching The Criteria' });
        }

        res.status(200).json({ message: 'Task Data Fetched Successfully', task });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update Task Data Using Mongoose

const updateTaskData = async (taskId, updatedTaskData) => {
    try {
        NonBlankUpdatedTaskData = Object.fromEntries(Object.entries(updatedTaskData).filter(([key, value]) => value !== "" && value !== undefined && value.length !== 0));

        const taskData = await taskModel.findByIdAndUpdate(taskId, NonBlankUpdatedTaskData, {
            returnDocument: 'after',
            runValidators: true,
        });
        return taskData;
    } catch (error) {
        console.log('Error', error.message);
        throw error;
    }
}

// Update Task Data Using Express API

app.put('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(404).json({ message: `Task With Id '${id}' Not Found` });
        }
        const task = await updateTaskData(req.params.id, req.body);
        res.status(200).json({ message: 'Task Data Successfully Updated', task });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors).map((err) => {
                if (err.kind === 'required') {
                    return `${err.path} is required`;
                }
                return `${err.path} ${err.message.toLowerCase()}`;
            });
            res.status(400).json({ error: `Invalid Input : ${errorMessages.join(', ')}` });
        } else if (error.code === 11000) {
            res.status(409).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Delete A Task Data Using Mongoose

const deleteTaskData = async (taskId) => {
    try {
        const taskDataDelete = await taskModel.findByIdAndDelete(taskId);
        return taskDataDelete;
    } catch (error) {
        console.log('Error', error.message);
        throw error;
    }
}

// Delete A Task Using Express API

app.delete('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(404).json({ message: `Task With Id '${id}' Not Found` });
        }

        const taskDataDeleted = await deleteTaskData(req.params.id);

        return res.status(200).json({ message: 'Task Deleted Successfully', taskDataDeleted });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('Server is Running on PORT', PORT);
});