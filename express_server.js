const express = require("express");
const cookieSession = require('cookie-session')
const bcrypt = require('bcryptjs');
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");
app.use(cookieSession({
    name: 'session',
    keys: [ "mysecretkey1", "mysecretkey2"],
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }))

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

const urlDatabase = {
    // b6UTxQ: {
    //     longURL: "https://www.tsn.ca",
    //     userID: "aJ48lW"
    // }
};

const users = { 
    // "axiyfg": {
    //   id: "axiyfg", 
    //   email: "bonu_9229@bk.ru", 
    //   password: "abc123"
    // },
};

function keyGen(keyLength) {
    var i, key = "", characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (i = 0; i < keyLength; i++) {
        key += characters.substr(Math.floor((Math.random() * charactersLength) + 1), 1);
    }
    return key;
}

function getUrl(shortUrl) {
    return urlDatabase[shortUrl];
}

function getUrlsByUserId(userId) {
    const urls = {};
    if (userId === undefined) {
        return urls;
    }
    for (const [key, value] of Object.entries(urlDatabase)) {
        if (value.userID == userId) {
            urls[key] = value;
        }
    }
    console.log(urls);
    return urls;
}

function addUrl(reqBody, userId) {
    const longUrl = reqBody.longURL;
    const shortUrl = keyGen(6);
    urlDatabase[shortUrl] = {
        longURL: longUrl,
        userID: userId
    };
    return shortUrl;
}

function deleteUrl(shortURL) {
    delete urlDatabase[shortURL];
}

function updateUrl(shortURL, reqBody) {
    const longUrl = reqBody.longURL;
    urlDatabase[shortURL].longURL = longUrl;
}

function registerNewUser(reqBody) {
    const email = reqBody.email;
    const password = reqBody.password;
    const userId = keyGen(6);
    const hashedPassword = bcrypt.hashSync(password, 10);
    users[userId] = {
        id: userId, 
        email: email, 
        password: hashedPassword
    };
    return userId;
}

function getUserById(userId) {
    return users[userId];
}

function getUserByEmail(email) {
    for (const [key, value] of Object.entries(users)) {
        if (value.email == email) {
            return value;
        }
    }
    return undefined;
}

app.get("/", (req, res) => {
    res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
    res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
    const user = getUserById(req.session.user_id)
    const userId = (user) ? user.id : undefined;
    const templateVars = { 
        urls: getUrlsByUserId(userId),
        user: user
    };
    res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
    const user = getUserById(req.session.user_id)
    if (user) {
        const shortUrl = addUrl(req.body, user.id);
        res.redirect('/urls/' + shortUrl);
    } else {
        res.status(403).send('Need to be logged in');
    }
});

app.post("/urls/:shortURL", (req, res) => {
    const user = getUserById(req.session.user_id)
    const url = getUrl(req.params.shortURL);
    if (user && url && user.id === url.userID) {
        updateUrl(req.params.shortURL, req.body);
        res.redirect('/urls');
    } else {
        res.status(403).send('Need to be logged in');
    }
});

app.get("/urls/new", (req, res) => {
    const user = getUserById(req.session.user_id)
    if (user) {
        const templateVars = { 
            user: user
        };
        res.render("urls_new", templateVars);
    } else {
        res.redirect('/login');
    }
});

app.get("/urls/:shortURL", (req, res) => {
    const templateVars = { 
        shortURL: req.params.shortURL, 
        longURL: urlDatabase[req.params.shortURL].longURL,
        user: getUserById(req.session.user_id)
    };
    res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
    const longURL = getUrl(req.params.shortURL).longURL;
    res.redirect(longURL);
});

app.post("/urls/:shortURL/delete", (req, res) => {
    const user = getUserById(req.session.user_id)
    const url = getUrl(req.params.shortURL);
    if (user && url && user.id === url.userID) {
        deleteUrl(req.params.shortURL)
        res.redirect('/urls');
    } else {
        res.status(403).send('Need to be logged in');
    }
});

app.get("/login", (req, res) => {
    const templateVars = { 
        user: getUserById(req.session.user_id)
    };
    res.render("login", templateVars);
});

app.post("/login", (req, res) => {
    if (req.body.email === undefined || req.body.email.length === 0) {
        res.status(400).send("Email is required");
        return;
    }
    if (req.body.password === undefined || req.body.password.length === 0) {
        res.status(400).send("Password is required");
        return;
    }
    const user = getUserByEmail(req.body.email);
    if (user === undefined) {
        res.status(403).send(`No user account found for ${ req.body.email }`);
        return;
    }
    if (!bcrypt.compareSync(req.body.password, user.password)) {
        res.status(403).send("Password does not match");
        return;
    }
    req.session.user_id = user.id;
    res.redirect('/urls');
});

app.post("/logout", (req, res) => {
    req.session.user_id = null;
    res.redirect('/urls');
});

app.get("/register", (req, res) => {
    const templateVars = { 
        user: getUserById(req.session.user_id)
    };
    res.render("register", templateVars);
});

app.post("/register", (req, res) => {
    if (req.body.email === undefined || req.body.email.length === 0) {
        res.status(400).send("Email is required");
        return;
    }
    if (req.body.password === undefined || req.body.password.length === 0) {
        res.status(400).send("Password is required");
        return;
    }
    if (getUserByEmail(req.body.email)) {
        res.status(400).send(`There's already an account for ${ req.body.email }`);
        return;
    }
    const userId = registerNewUser(req.body)
    req.session.user_id = userId;
    res.redirect('/urls');
});

app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}!`);
});

console.log("running express_server.js");