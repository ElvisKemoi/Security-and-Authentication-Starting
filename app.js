const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const exp = require("constants");
const app = express();
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
	email: String,
	password: String,
});

const secret = "Thisisourlittlesecret";
userSchema.plugin(encrypt, {
	secret: secret,
	encryptedFields: ["password"],
});

const User = new mongoose.model("User", userSchema);

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
	res.render("home");
});

app.get("/login", (req, res) => {
	res.render("login");
});

app.get("/register", (req, res) => {
	res.render("register");
});

app.post("/register", async (req, res) => {
	const newUser = new User({
		email: req.body.username,
		password: req.body.password,
	});
	const saveStatus = await newUser.save();
	res.render("secrets");
});

app.post("/login", async (req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	const foundUser = await User.findOne({ email: username });
	if (foundUser) {
		if (foundUser.password === password) {
			res.render("secrets");
		} else {
			res.redirect("login");
		}
	} else {
		res.redirect("login");
	}
});

app.listen(3000, () => {
	console.log("Server is live on port 3000");
});
