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
            return res.status(400).json({ success: false, error: `Invalid Credentials` });
        }

        const isMatching = await bcrypt.compare(password, user.password);

        if (!isMatching) {
            return res.status(400).json({ success: false, error: 'Invalid Credentials' });
        }

        const token_value = JWT.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '24h' });

        if (!token_value) {
            return res.status(400).json({ success: false, error: 'Failed to Generate Token' });
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
        const { owners, tags, ...restTaskFields } = taskQueryParameter;
        const nonEmptyTaskFields = Object.fromEntries(Object.entries(restTaskFields).filter(([Key, value]) => value !== undefined && value !== ""));

        if (owners) {
            nonEmptyTaskFields.owners = { $in: owners.split(/,\s*/) };
        }

        if (tags) {
            nonEmptyTaskFields.tags = { $in: tags.split(/,\s*/) };
        }

        const allTaskData = await taskModel.find(nonEmptyTaskFields).populate('project owners tags');
        return allTaskData;
    } catch (error) {
        console.log('Error', error.message);
        throw error;
    }
}

// Get Task Data using express API

app.get('/tasks', async (req, res) => {
    try {
        const allowedQueryFields = ['team', 'owners', 'tags', 'project', 'status'];

        const providedQueryKeys = Object.keys(req.query);

        const invalidKeys = providedQueryKeys.filter((key) => !allowedQueryFields.includes(key));

        if (invalidKeys.length > 0) {
            return res.status(400).json({ success: false, error: `Invalid Query Operators - ${invalidKeys.join(', ')}` });
        }

        const task = await getAllTaskData(req.query);

        if (!task || task.length === 0) {
            return res.status(404).json({ success: false, error: 'No Task Data Found Matching The Criteria' });
        }

        return res.status(200).json({ success: true, message: 'Task Data Fetched Successfully', task });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update Task Data Using Mongoose

const updateTaskData = async (taskId, updatedTaskData) => {
    try {
        const NonBlankUpdatedTaskData = Object.fromEntries(Object.entries(updatedTaskData).filter(([key, value]) => value !== "" && value !== undefined && value.length !== 0));

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
            return res.status(404).json({ success: false, error: `Task Id Missing` });
        }
        const task = await updateTaskData(req.params.id, req.body);

        if (!task) {
            return res.status(404).json({ success: false, error: `Task With Id '${id}' Not Found` });
        }

        res.status(200).json({ success: true, message: 'Task Data Successfully Updated', task });
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
            return res.status(404).json({ success: false, error: `Task With Id '${id}' Not Found` });
        }

        const taskDataDeleted = await deleteTaskData(req.params.id);

        if (!taskDataDeleted) {
            return res.status(404).json({ success: false, error: `Task With Id '${id}' Not Found` });
        }
        return res.status(200).json({ success: true, message: 'Task Deleted Successfully', taskDataDeleted });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add Team Data using Mongoose 

const addNewTeam = async (teamDetails) => {
    try {
        const { selectedUserIds, ...leftTeamDetails } = teamDetails;

        const newTeamData = new teamModel(leftTeamDetails);

        const savedTeamData = await newTeamData.save();

        if (selectedUserIds && selectedUserIds.length > 0) {
            await userModel.updateMany(
                { _id: { $in: selectedUserIds } },
                { $set: { team: newTeamData._id } }
            );
        }

        return savedTeamData;
    } catch (error) {
        console.error('Error', error.message);
        throw error;
    }
}

// Add New Team Using Express API

app.post('/teams', authenticateJWT, async (req, res) => {
    try {
        const newTeam = await addNewTeam(req.body);
        return res.status(201).json({ success: true, message: 'New Team Added And Members Assigned Successfully', newTeam });
    } catch (error) {
        if (error.name === "ValidationError") {
            const errorMessages = Object.values(error.errors).map((err) => {
                if (err.kind === "required") {
                    return `${err.path} is required`;
                }
                return `${err.path} ${err.message.toLowerCase()}`;
            });
            res.status(400).json({ success: false, error: `Invalid Inputs : ${errorMessages.join(', ')}` });
        } else if (error.code === '11000') {
            const fieldName = Object.keys(error.keyPattern)[0];
            res.status(409).json({ success: false, error: `${fieldName} Already Exists` });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    }
});

// Add New Members To Existing Team Using Mongoose

const newMemberToExistingTeam = async (newMemberDetail) => {
    try {
        const { selectedUserIds, ...leftNewMemberDetail } = newMemberDetail;
        const targetTeamId = leftNewMemberDetail.teamId || leftNewMemberDetail._id || leftNewMemberDetail.team;

        if (selectedUserIds && selectedUserIds.length > 0) {
            const newMember = await userModel.updateMany(
                { _id: { $in: selectedUserIds } },
                { $set: { team: targetTeamId } }
            );

            return newMember;
        }

        return { message: 'No member IDs provided to assign' };
    } catch (error) {
        console.error('Error', error.message);
        throw error;
    }
}

// Add New Members To Existing Team Using Express API

app.post('/teams/add-members', authenticateJWT, async (req, res) => {
    try {
        const member = await newMemberToExistingTeam(req.body);
        return res.status(201).json({ success: true, message: 'New Member Added Successfully', member });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Team Data + Member Data Using Mongoose

const getTeamData = async (teamId) => {
    try {
        const teamsWithMembers = await teamModel.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(teamId)
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'team',
                    as: 'members'
                }
            },
            {
                $project: {
                    name: 1,
                    description: 1,
                    'members._id': 1,
                    'members.name': 1,
                    'members.email': 1
                }
            }
        ]);

        return teamsWithMembers;

    } catch (error) {
        console.error('Error', error.message);
        throw error;
    }
};

// Get Team Data + Member Data Using Express API

app.get('/teams/:teamId', async (req, res) => {
    try {

        const teamData = await getTeamData(req.params.teamId);

        if (!teamData || teamData.length === 0) {
            return res.status(404).json({ success: false, error: 'Failed To Fetch Team Data', });
        }

        return res.status(200).json({ success: true, message: 'Team Data Fetched Successfully', teamData });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get List Of Available Users To Be Added In New Team Using Mongoose

const getAvailableUsers = async () => {
    try {
        const availableUsers = await userModel.find({ team: null }).select('-password');
        return availableUsers;
    } catch (error) {
        console.error('Error', error.message);
        throw error;
    }
}

// Get List Of Available Users To Be Added In New Team Using Express API

app.get('/teams/add-members/available-users', authenticateJWT, async (req, res) => {
    try {
        const usersAvailable = await getAvailableUsers();

        if (!usersAvailable || usersAvailable.length === 0) {
            return res.status(404).json({ success: false, error: 'No Users/Team Members(Owners) Left To Add (Most Likely They Are Part Of Other Teams)' });
        }

        return res.status(200).json({ success: true, message: 'Users/Team Members(Owners) Available To Be Added In A Team', usersAvailable });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('Server is Running on PORT', PORT);
});