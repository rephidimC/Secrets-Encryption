//jshint esversion:6
require('dotenv').config();
const md5 = require("md5");
const express = require("express");
const mongoose = require("mongoose");
// const encrypt = require('mongoose-encryption');
// removed because we're no longer encrypting but hashing
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");

const app = express();
const path = require("path");

console.log(md5('message'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({
  extended: true
}));

mongoose.connect("mongodb://localhost:27017/secretsDB", {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useFindAndModify: false
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "A must to have a name"]
  },
  password: {
    type: String,
    required: [true, "A must to have a body"]
  }
});

//ENCRYPTION KEY SET BY ---var secret = "XXX";
// to encrypt the above key, we need environment variable, hence, we cut the above and move to .env file.



// db.connect({
//   // host: process.env.DB_HOST,
//   // username: process.env.DB_USER,
//   password: process.env.SECRET
// })

// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });
//the above without ENCRYPTION

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });
// removed because we're no longer encrypting but hashing


const User = mongoose.model("User", userSchema);

app.use(express.static("public"));

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/secrets", function(req, res) {
  res.render("secrets");
});

app.get("/submit", function(req, res) {
  res.render("submit");
});

app.post("/register", function(req, res) {
  const usernameInput = req.body.username;
  const password = req.body.password;

  const hashUsernameInput = md5(usernameInput);
  const hashPassword = md5(password);

  const newUser = new User({
    email: hashUsernameInput,
    password: hashPassword,
  });

  newUser.save(function(err) {
    if (!err) {
      res.render("secrets");
    }
    else {
      console.log(err);
      res.render("error 404");
    }
  })
});

app.post("/login", function(req, res) {
  const usernameInput = req.body.username;
  const passwordInput = req.body.password;

  const hashUsernameInput = md5(usernameInput);
  const hashPassword = md5(passwordInput)

  User.findOne({ email: hashUsernameInput }, function(err, foundData) {
    if (foundData) {
      if (foundData.password === hashPassword) {
        res.render("secrets");
      }
    } else {
      console.log(err);
      res.render("login");
    }
  });
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
