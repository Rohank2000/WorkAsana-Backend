const mongoose = require('mongoose');

const getMongoDBDetails = process.env.MongoDBURI;

const getDatabaseConnection = async () => {
    try {
        const connection = await mongoose.connect(getMongoDBDetails);
        if (connection) {
            console.log('Connected to MongoDB successfully');
        }
    } catch (error) {
        console.error('Failed to connect to Database', error);
    }
};

module.exports = { getDatabaseConnection };
