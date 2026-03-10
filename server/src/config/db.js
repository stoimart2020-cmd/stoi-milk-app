const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        console.log(`Connecting to MongoDB Atlas...`);
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Atlas Connection Failed: ${error.message}`);
        console.error(`\n⚠️  Make sure your IP is whitelisted in MongoDB Atlas Network Access!`);
        console.error(`   Visit: https://cloud.mongodb.com/ → Security → Network Access\n`);
        process.exit(1);
    }
};

module.exports = connectDB;
