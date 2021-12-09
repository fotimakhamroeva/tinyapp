const express = require("express");
const cookies = require("cookie-parser");
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");
app.use(cookies());

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

function generateRandomString(reqBody) {
    const longUrl = reqBody.longURL;
    const shortUrl = keyGen(6);
    urlDatabase[shortUrl] = longUrl;
    return shortUrl;
}

function keyGen(keyLength) {
    var i, key = "", characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (i = 0; i < keyLength; i++) {
        key += characters.substr(Math.floor((Math.random() * charactersLength) + 1), 1);
    }
    return key;
}

function deleteUrl(shortURL) {
    delete urlDatabase[shortURL];
}

function updateUrl(shortURL, reqBody) {
    const longUrl = reqBody.longURL;
    urlDatabase[shortURL] = longUrl;
}

app.get("/", (req, res) => {
    res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
    res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
    const templateVars = { 
        urls: urlDatabase,
        username: req.cookies["username"],
    };
    res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
    console.log(req.body);  // Log the POST request body to the console
    const shortUrl = generateRandomString(req.body);
    res.redirect('/urls/' + shortUrl);
});

app.post("/urls/:shortURL", (req, res) => {
    console.log(req.body);  // Log the POST request body to the console
    updateUrl(req.params.shortURL, req.body);
    res.redirect('/urls');
});

app.get("/urls/new", (req, res) => {
    const templateVars = { 
        username: req.cookies["username"],
    };
    res.render("urls_new", templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
    const templateVars = { 
        shortURL: req.params.shortURL, 
        longURL: urlDatabase[req.params.shortURL],
        username: req.cookies["username"]
    };
    res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
    const longURL = urlDatabase[req.params.shortURL];
    res.redirect(longURL);
});

app.post("/urls/:shortURL/delete", (req, res) => {
    console.log(req.params.shortURL);  // Log the POST request body to the console
    deleteUrl(req.params.shortURL)
    res.redirect('/urls');
});

app.post("/login", (req, res) => {
    res.cookie('username', req.body.username);
    res.redirect('/urls');
});

app.post("/logout", (req, res) => {
    res.clearCookie('username');
    res.redirect('/urls');
});

app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}!`);
});

console.log("running express_server.js");