require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const exp = require("constants");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
	session({
		secret: "Our little secret.",
		resave: false,
		saveUninitialized: false,
	})
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");
const userSchema = new mongoose.Schema({
	googleId: String,
	email: String,
	password: String,
	secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
passport.use(User.createStrategy());

passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser(async function (id, done) {
	try {
		const user = await User.findById(id);
		done(null, user);
	} catch (err) {
		done(err, null);
	}
});

// passport.use(
// 	new GoogleStrategy(
// 		{
// 			clientID: process.env.GOOGLE_CLIENT_ID,
// 			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
// 			callbackURL: "http://localhost:3000/auth/google/secrets",
// 		},
// 		function (accessToken, refreshToken, profile, cb) {
// 			console.log(profile);
// 			User.findOrCreate({ googleId: profile.id }, function (err, user) {
// 				return cb(err, user);
// 			});
// 		}
// 	)
// );
passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL: "http://localhost:3000/auth/google/secrets",
			userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
		},
		async function (accessToken, refreshToken, profile, cb) {
			console.log(profile);

			try {
				let user = await User.findOne({ googleId: profile.id });
				if (!user) {
					user = await User.create({ googleId: profile.id });
				}
				return cb(null, user);
			} catch (err) {
				return cb(err, null);
			}
		}
	)
);

app.get("/", (req, res) => {
	res.render("home");
});

app.get(
	"/auth/google",
	passport.authenticate("google", { scope: ["profile"] })
);
app.get(
	"/auth/google/secrets",
	passport.authenticate("google", { failureRedirect: "/login" }),
	function (req, res) {
		// Successful authentication, redirect home.
		res.redirect("/secrets");
	}
);

app.get("/login", (req, res) => {
	res.render("login");
});

app.get("/register", (req, res) => {
	res.render("register");
});

app.get("/secrets", async (req, res) => {
	const allUsersWithSecrets = await User.find({ secret: { $ne: null } });
	res.render("secrets", { usersWithSecrets: allUsersWithSecrets });
});

app.get("/submit", (req, res) => {
	if (req.isAuthenticated()) {
		res.render("submit");
	} else {
		res.redirect("/login");
	}
});

app.post("/submit", async (req, res) => {
	const submitedSecret = req.body.secret;

	const founduser = await User.updateOne(
		{ _id: req.user.id },
		{ $set: { secret: submitedSecret } }
	);
	if (founduser.modifiedCount === 1) {
		res.redirect("/secrets");
	} else {
		res.redirect("/submit");
	}
});

app.get("/logout", (req, res) => {
	// req.logOut();
	req.session.destroy((err) => {
		if (err) {
			console.log("Error destroying session:", err);
		}
		res.redirect("/");
	});
});

app.post("/register", (req, res) => {
	User.register(
		{ username: req.body.username },
		req.body.password,
		(err, user) => {
			if (err) {
				console.log(err);
				res.redirect("/register");
			} else {
				passport.authenticate("local")(req, res, () => {
					res.redirect("/secrets");
				});
			}
		}
	);
});

app.post("/login", async (req, res) => {
	const user = new User({
		username: req.body.username,
		password: req.body.password,
	});
	req.login(user, (err) => {
		if (err) {
			console.log(err);
		} else {
			passport.authenticate("local")(req, res, () => {
				res.redirect("/secrets");
			});
		}
	});
});

app.listen(3000, () => {
	console.log("Server is live on port 3000");
});
