require("dotenv").config();

module.exports = {
    server: {
        port: process.env.PORT || 3000,
        session: {
            secret: process.env.SESSION_SECRET || "keyboard cat",
            resave: false,
            saveUninitialized: false,
            cookie: {
                maxAge: 60000,
            },
        },
    },
    browser: {
        executablePath: process.env.EXECUTABLE_PATH || "/usr/bin/chromium",
        headless: process.env.HEADLESS || "new",
        args: ["--disable-dev-shm-usage", "--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-http2", "--disable-blink-features=AutomationControlled", "--disable-infobars", "--window-position=0,0", "--ignore-certifcate-errors", "--ignore-certifcate-errors-spki-list"],
        defaultViewport: {
            width: 1920,
            height: 1080,
        },
        userDataDir: process.env.USER_DATA_DIR || null,
        ignoreHTTPSErrors: true,
        navigationTimeout: 10000, // 10 seconds timeout for navigation
    },
    test: {
        timeout: 60000, // 60 seconds timeout for tests
    },
    cheerio: {
        normalizeWhitespace: false,
        xmlMode: false,
        decodeEntities: true,
    },
};
