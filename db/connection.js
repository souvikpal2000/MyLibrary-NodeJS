const mongoose = require("mongoose");
require('dotenv').config();

mongoose.connect(process.env.MONGO_URL, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true, 
    useCreateIndex:true 
})
.then(() => {
    console.log("Connected to MongoDB");
})
.catch((err) => {
    console.log(`Error : ${err}`);
})