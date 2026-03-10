const mongoose = require("mongoose");
const User = require("../models/User");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const findUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const mobile = "8908908900";
        const user = await User.findOne({ mobile });

        if (user) {
            console.log(`FOUND USER:`);
            console.log(`- ID: ${user._id}`);
            console.log(`- Name: ${user.name}`);
            console.log(`- Mobile: ${user.mobile}`);
            console.log(`- Role: ${user.role}`); // This is the key
        } else {
            console.log(`User with mobile ${mobile} NOT FOUND.`);
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

findUser();
