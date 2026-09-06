const mongoose = require("mongoose");

mongoose
    .connect("mongodb+srv://24104080_db_user:pravin12345@cluster-1.8jjfbjq.mongodb.net/?appName=cluster-1")
    .then(() => {
        console.log("MongoDB Connected Successfully");
        process.exit();
    })
    .catch((err) => {
        console.log("ERROR:", err.message);
        process.exit();
    });