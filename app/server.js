const express = require("express");
const app = express();
const lib = require("./lib");
const puppeteer = require("puppeteer");
const proxyChain = require("proxy-chain");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const EventEmitter = require("events");
const captchaHandler = require("./captcha-handler");

app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

// Cookie and session middleware
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

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

        if (process.env.NODE_ENV != "test") {
            console.log(options);
        }

        // Create a new page for this request
        const page = await browser.newPage();
        try {
            // Set up basic page configuration
            if (options.userAgent) {
                await page.setUserAgent(options.userAgent);
            }
            if (options.headers) {
                await page.setExtraHTTPHeaders(options.headers);
            }

            // Navigate to the URL
            await page.goto(options.url, { waitUntil: "networkidle0" });

            // Check for CAPTCHA
            const hasCaptcha = await captchaHandler.checkForCaptcha(page);
            if (hasCaptcha) {
                console.log("CAPTCHA detected, attempting to solve...");
                await captchaHandler.solveCaptcha(page, options.url);

                // Wait for page to stabilize after CAPTCHA
                await delay(2000);
            }

            // Process the page as normal
            var result = await lib(browser, options);

            if (result == null) {
                res.status(422).json({ data: "" });
            } else {
                res.json({ data: result });
            }
        } finally {
            // Always close the page
            await page.close();
        }
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
