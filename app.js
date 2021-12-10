require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fileupload = require("express-fileupload");
const AWS = require("aws-sdk");

const app = express();
const http = require("http").createServer(app);
const port = process.env.PORT || 8000;

// AWS S3
const credentials = new AWS.Credentials({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
AWS.config.credentials = credentials;
const s3 = new AWS.S3();
app.set("s3", s3);

// middlewares
app.use(
  cors({
    origin: process.env.APP,
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(fileupload());

// routes
app.use("/washes", require("./routes/washes"));
app.use("/user", require("./routes/users"));
app.use("/ticket", require("./routes/tickets"));

async function start() {
  try {
    await mongoose.connect(process.env.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    http.listen(port, () => {
      console.log("We are live on " + port);
    });
  } catch (e) {
    console.log("Server error:", e.message);
  }
}

start();
