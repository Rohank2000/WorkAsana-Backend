require('dotenv').config();
const { getDatabaseConnection } = require('./db/db.connect');
getDatabaseConnection();

const mongoose = require('mongoose');
const JWT = require('jsonwebtoken');
const bcrypt = require('bcrypt');
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

// Middleware To Authenticate JWT Token

const authenticateJWT = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer')) {
            return res.status(401).json({ success: false, error: 'Access Denied - No Token Found' });
        }

        const token = authHeader.split(' ')[1];

        const verifiedToken = JWT.verify(token, process.env.JWT_SECRET_KEY);

        req.user = verifiedToken;

        next();

    } catch (error) {
        return res.status(401).json({ success: false, error: `Access Denied - ${error.message}` });
    }
}

// User Sign Up Using Mongoose 

const signUpNewUser = async (userDetails) => {
    try {
        const newUser = new userModel(userDetails);
        const savedNewDetails = await newUser.save();
        return savedNewDetails;
    } catch (error) {
        console.error('Error', error.message);
        throw error;
    }
}

// User Sign Up Using Express API

app.post('/auth/signup', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await signUpNewUser(req.body);

        return res.status(201).json({ success: true, message: `User with Email Id - ${email} Successfully Registered` });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors).map((err) => {
                if (err.kind === 'required') {
                    return `${err.path} is required`;
                }
                return `${err.path} ${err.message.toLowerCase()}`
            });
            res.status(400).json({ success: false, error: `Invalid Input : ${errorMessages.join(', ')}` });
        } else if (error.code === 11000) {
            const fieldName = Object.keys(error.keyPattern)[0];
            res.status(409).json({ success: false, error: `${fieldName} Already Exists` });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    }
});

// User Log In Using Mongoose

const userLogIn = async (logInCredentials) => {
    try {
        const { email } = logInCredentials

        const userLoggedIn = await userModel.findOne({ email });

        return userLoggedIn;

    } catch (error) {
        console.error('Error', error.message);
        throw error;
    }
}
// User Log In Using Express API

app.post('/auth/login', async (req, res) => {
    try {
        const { password } = req.body;

        const user = await userLogIn(req.body);

        if (!user) {
            return res.status(400).json({ success: false, message: `Invalid Credentials` });
        }

        const isMatching = await bcrypt.compare(password, user.password);

        if (!isMatching) {
            return res.status(400).json({ success: false, message: 'Invalid Credentials' });
        }

        const token_value = JWT.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '24h' });

        if (!token_value) {
            return res.status(400).json({ success: false, message: 'Failed to Generate Token' });
        }

        return res.status(200).json({ success: true, message: 'Log In Successful', token_value });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
})

// Get User Details Using mongoose 

const getUserDetails = async (userId) => {
    try {
        const userDetails = await userModel.findById(userId).select('-password');
        return userDetails;
    } catch (error) {
        console.error('Error', error.message);
        throw error;
    }
}

// Get User Details Using Express API

app.get('/auth/me', authenticateJWT, async (req, res) => {
    try {
        const user = await getUserDetails(req.user.userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User Not Found' });
        }

        return res.status(200).json({ success: true, message: 'User Details Fetched Successfully', user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

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

app.post('/tasks', authenticateJWT, async (req, res) => {
    try {
        const task = await addNewTask(req.body);
        return res.status(201).json({ success: true, message: 'New Task Added', task });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const message = Object.values(error.errors).map((err) => {
                if (err.kind === 'required') {
                    return `${err.path} is required`;
                }
                return `'${err.path}' ${err.message.toLowerCase()}`;
            });
            res.status(400).json({ success: false, error: `Invalid Input : ${message.join(', ')}` });
        } else if (error.code === '11000') {
            res.status(409).json({ success: false, error: error.message });
        } else {
            res.status(500).json({ success: false, error: error.message });
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
            return res.status(400).json({ success: false, message: `Invalid Query Operators - ${invalidKeys.join(', ')}` });
        }

        const task = await getAllTaskData(req.query);

        if (!task || task.length === 0) {
            return res.status(404).json({ success: false, message: 'No Task Data Found Matching The Criteria' });
        }

        return res.status(200).json({ success: true, message: 'Task Data Fetched Successfully', task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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

app.put('/tasks/:id', authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(404).json({ success: false, message: `Task With Id '${id}' Not Found` });
        }
        const task = await updateTaskData(req.params.id, req.body);
        res.status(200).json({ success: false, message: 'Task Data Successfully Updated', task });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors).map((err) => {
                if (err.kind === 'required') {
                    return `${err.path} is required`;
                }
                return `${err.path} ${err.message.toLowerCase()}`;
            });
            res.status(400).json({ success: false, error: `Invalid Input : ${errorMessages.join(', ')}` });
        } else if (error.code === 11000) {
            res.status(409).json({ success: false, error: error.message });
        } else {
            res.status(500).json({ success: false, error: error.message });
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

app.delete('/tasks/:id', authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(404).json({ success: false, message: `Task With Id '${id}' Not Found` });
        }

        const taskDataDeleted = await deleteTaskData(req.params.id);

        return res.status(200).json({ success: true, message: 'Task Deleted Successfully', taskDataDeleted });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('Server is Running on PORT', PORT);
});