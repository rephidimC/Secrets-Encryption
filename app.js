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
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');



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
  password: String,
  // -------------------------------------xxxxxxxxxxxxxxxxxxxx--------------------------------------
  // the above are used when we run the authentication locally, but if its an external one, we need to add an extra field, as below
  // -------------------------------------xxxxxxxxxxxxxxxxxxxx--------------------------------------
  googleId: String,
  facebookId: String,
  // -------------------------------------xxxxxxxxxxxxxxxxxxxx--------------------------------------
  // the below has just been added so we can add this extra field in the db for the submitted secret
  // -------------------------------------xxxxxxxxxxxxxxxxxxxx--------------------------------------
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//ENCRYPTION KEY SET BY ---var secret = "XXX";
// to encrypt the above key, we need environment variable, hence, we cut the above and move to .env file.



// db.connect({
//   // host: process.env.DB_HOST,
//   // username: process.env.DB_USER,
//
// })

// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });
//the above without ENCRYPTION

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });
// removed because we're no longer encrypting but hashing


const User = mongoose.model("User", userSchema);

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());
// -------------------------------------xxxxxxxxxxxxxxxxxxxx--------------------------------------
// use static serialize and deserialize of model for passport session support
//only necessary when using sessions.

// -------------------------------------xxxxxxxxxxxxxxxxxxxx--------------------------------------
// passport.serializeUser(User.serializeUser());
// //serialize stores data(cookie)
// passport.deserializeUser(User.deserializeUser());
//deserialize allows passport to destroy the cookie
// -------------------------------------xxxxxxxxxxxxxxxxxxxx--------------------------------------
// the above are used for local operations, but when we need to use external ones like google to authenticate, we need something global, which also works for local.
// -------------------------------------xxxxxxxxxxxxxxxxxxxx--------------------------------------
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    // 817778500263-ikt9rvgjrad72g231a1hra3vcvtagl7g.apps.googleusercontent.com,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
    // http://www.example.com/auth/google/callback
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    //accessToken-allows us to access user data
    //refreshToken-allows us access for a longer period of time
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.CLIENTIDFB,
    clientSecret: process.env.CLIENTSECRETFB,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.use(express.static("public"));

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/auth/google",
  //why this? because we need to have a page that the google authentication route(button) in both the register and login goes to.
  passport.authenticate("google",  { scope: [ "profile" ] })
  //scope is to define what we want from the user's google account when they login
);

app.get("/auth/google/secrets",
//where did we get this url from? we set it when setting up the google api
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  }
);

app.get("/auth/facebook",
  passport.authenticate("facebook", { scope: [ "profile" ] })
);

app.get("/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  }
);

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
  // if (req.isAuthenticated()){
  //   res.render("secrets");
  // } else {
  //   res.redirect("/login");
  // }
  // why are we removing the above? it isn't a priviledged page as anyone should be able to see the secrets posted anonymously whether signed in/not.
  User.find({"secret": {$ne: null}}, function(err, foundUsers) {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });

});

app.get("/submit", function(req, res) {
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res) {
  const submittedSecret= req.body.secret;
  console.log(submittedSecret);
  console.log(req.user.id);
  // But we need to know which user submitted the secret, so we can save it in their file.
  // req.user is passport's way of helping identify this.
  // const secret = new Secret ({
  //   secret: req.body.secret
  // });
  User.findById(req.user.id, function(err, foundUser) {
    if (foundUser) {
      foundUser.secret = submittedSecret;
      foundUser.save(function(){
        res.redirect("/secrets");
      });
    } else {
      console.log(err);
    }
  });
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
