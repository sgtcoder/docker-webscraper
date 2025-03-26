const express = require("express");
const app = express();
const puppeteer = require("puppeteer-extra");
const puppeteerCore = require("puppeteer-core");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const proxyChain = require("proxy-chain");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const EventEmitter = require("events");
const config = require("./config");
const cheerio = require("cheerio");
const Promise = require("bluebird");
const UserAgent = require("user-agents");

// Configure puppeteer-extra with puppeteer-core
puppeteer.use(StealthPlugin());
puppeteer.createBrowserFetcher = puppeteerCore.createBrowserFetcher;

// Express middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session(config.server.session));

let browser;
const browserReadyEmitter = new EventEmitter();

// Browser initialization
(async () => {
    let browserOptions = { ...config.browser };

    if (process.env.PROXY_URL) {
        const newProxyUrl = await proxyChain.anonymizeProxy(process.env.PROXY_URL);
        browserOptions.args.push(`--proxy-server=${newProxyUrl}`);
    }

    browser = await puppeteer.launch(browserOptions);
    browserReadyEmitter.emit("ready");
})();

// Scraping function
async function scrapePage(browser, options, config) {
    let page;
    try {
        page = await browser.newPage();

        // Add additional page configurations
        await page.setExtraHTTPHeaders({
            "Accept-Language": "en-US,en;q=0.9",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Sec-Ch-Ua": '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Upgrade-Insecure-Requests": "1",
        });

        // More thorough webdriver and automation evasion
        await page.evaluateOnNewDocument(() => {
            // Override navigator properties
            Object.defineProperty(navigator, "webdriver", { get: () => undefined });
            Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });

            // Add Chrome runtime
            window.chrome = {
                runtime: {},
            };

            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (parameters.name === "notifications" ? Promise.resolve({ state: Notification.permission }) : originalQuery(parameters));
        });

        // Use viewport from options or config
        await page.setViewport(options.viewport || config.browser.defaultViewport);
        await page.setDefaultNavigationTimeout(0);

        options = options || {};

        if (options.noCookies) {
            await page._client.send("Network.clearBrowserCookies");
        }

        if (!options.url) {
            return {
                error: new Error("Please provide url"),
                status: 400,
            };
        }

        const userAgent = options.userAgent || new UserAgent().toString();
        await page.setUserAgent(userAgent);

        if (options.cookies) {
            await Promise.all((Array.isArray(options.cookies) ? options.cookies : [options.cookies]).map(async (cookie) => await page.setCookie(cookie)));
        }

        if (options.headers) {
            await Promise.all((Array.isArray(options.headers) ? options.headers : [options.headers]).map(async (header) => await page.setExtraHTTPHeaders(header)));
        }

        const response = await page.goto(options.url, {
            timeout: config.browser.navigationTimeout,
        });

        const status = response.status();

        if (status !== 200 && status !== 304) {
            await page.close();
            return {
                error: new Error(`Page returned status code: ${status}`),
                status: status,
            };
        }

        const html = await page.content();

        if (options.pageFunction) {
            const $ = cheerio.load(html, config.cheerio);
            const result = options.pageFunction($);
            await page.close();
            return {
                data: result || null,
                status: status,
            };
        }

        await page.close();
        return {
            data: html || null,
            status: status,
        };
    } catch (error) {
        console.error("Final error:", error.message);
        if (page) await page.close();
        return {
            error: error,
            status: 500,
        };
    }
}

// Routes
app.use((req, res, next) => {
    if (!browser) {
        return res.status(503).json({
            error: "Service Unavailable: Browser not ready",
        });
    }
    next();
});

app.all("/", async (req, res) => {
    try {
        const options = {
            url: req.body.url || "http://localhost:8080/status",
            pageFunction: req.body.pageFunction ? eval(`(${req.body.pageFunction})`) : null,
            delay: req.body.delay,
            noCookies: req.body.noCookies,
            userAgent: req.body.userAgent,
            headers: req.body.headers,
            cookies: req.body.cookies,
        };

        const result = await scrapePage(browser, options, config);

        // If there was an error
        if (result.error) {
            return res.status(result.status || 500).json({
                error: result.error.message,
                targetStatus: result.status,
            });
        }

        // Return 206 for empty results
        if (result.data == null || result.data === "") {
            return res.status(206).json({
                data: null,
                targetStatus: result.status,
            });
        }

        // Return 200 for successful results with data
        res.status(200).json({
            data: result.data,
            targetStatus: result.status,
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            targetStatus: null,
        });
    }
});

// Status route
app.get("/status", async (req, res) => {
    res.status(200).json({});
});

// Test routes
app.get("/test", (req, res) => {
    res.status(200).send("<p>Hello World!</p>");
});

app.get("/agent", (req, res) => {
    res.status(200).send(`<p>${req.headers["user-agent"]}</p>`);
});

app.get("/cookies", (req, res) => {
    res.status(200).send(`<p>${req.cookies["connect.sid"]}</p>`);
});

module.exports = { app, browserReadyEmitter, config };
