const express = require("express");
const app = express();
const lib = require("./lib");
const puppeteer = require("puppeteer");
const proxyChain = require("proxy-chain");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const EventEmitter = require("events");

app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

// Add cookie and session middleware for testing
app.use(cookieParser());
app.use(
    session({
        secret: "keyboard cat",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 60000,
        },
    })
);

let browser;
const browserReadyEmitter = new EventEmitter();

(async () => {
    var executablePath = process.env.EXECUTABLE_PATH || "/usr/bin/chromium";
    var headless = process.env.HEADLESS || "new";

    var args = ["--disable-dev-shm-usage", "--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-http2"];

    if (process.env.PROXY_URL) {
        const newProxyUrl = await proxyChain.anonymizeProxy(process.env.PROXY_URL);
        args.push(`--proxy-server=${newProxyUrl}`);
    }

    var options = {
        headless: headless,
        executablePath: executablePath,
        args: args,
    };

    if (process.env.USER_DATA_DIR) {
        options.userDataDir = process.env.USER_DATA_DIR;
    }

    console.log("Browser loading");

    browser = await puppeteer.launch(options);

    console.log("Browser loaded");
    browserReadyEmitter.emit("ready");
})();

app.use((req, res, next) => {
    if (!browser) {
        return res.status(503).send("Service Unavailable: Browser not ready");
    }
    next();
});

app.all("/", async (req, res) => {
    try {
        var options = {
            url: req.body.url || "http://localhost:8080/status",
            pageFunction: req.body.pageFunction ? eval(`(${req.body.pageFunction})`) : null,
            delay: req.body.delay,
            noCookies: req.body.noCookies,
            userAgent: req.body.userAgent,
            headers: req.body.headers,
            cookies: req.body.cookies,
        };

        console.log(options);

        var result = await lib(browser, options);
        res.json(result);
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/status", async (req, res) => {
    res.json({});
});

// Add test routes
app.get("/test", (req, res) => {
    res.send("<p>Hello World!</p>");
});

app.get("/agent", (req, res) => {
    res.send(`<p>${req.headers["user-agent"]}</p>`);
});

app.get("/cookies", (req, res) => {
    res.send(`<p>${req.cookies["connect.sid"]}</p>`);
});

module.exports = { app, browserReadyEmitter };
