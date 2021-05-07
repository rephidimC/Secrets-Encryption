//jshint esversion:6
require('dotenv').config();

const express = require("express");
const mongoose = require("mongoose");
// const encrypt = require('mongoose-encryption');
// removed because we're no longer encrypting but hashing
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");

const app = express();
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
//we don't need to require passport mongoose as its one of the dependencies to be requested by passport-local-mongoose.


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({
  extended: true
}));

//the following are for express-session.
//it is important to place the code here

app.use(session({
  secret: "A secret is a good thing to keep",
  //this secret is to be kept safe and remembered consistently.
  resave: false,
  saveUninitialized: false,
  cookie: {}
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/secretsDB", {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useFindAndModify: false,
  useCreateIndex: true
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

userSchema.plugin(passportLocalMongoose);

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

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
//only necessary when using sessions.
passport.serializeUser(User.serializeUser());
//serialize stores data(cookie)
passport.deserializeUser(User.deserializeUser());
//deserialize allows passport to destroy the cookie

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

app.get("/submit", function(req, res) {
  res.render("submit");
});

app.get("/secrets", function(req, res) {
  if (req.isAuthenticated()){
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res) {
  User.register({username:req.body.username, active: false}, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
      //the above line ofcode tells the browser to have a cookie, which it holds on to until the browser session expires.
    }
  });
});

app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function (err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
