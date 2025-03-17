const path = require("path");
const puppeteer = require("puppeteer");

// Add a utility function for delays
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class CaptchaHandler {
    constructor() {
        this.challengeId = null;
        this.debug = process.env.DEBUG === "true";
    }

    log(...args) {
        if (this.debug) {
            console.log("[CaptchaHandler]", ...args);
        }
    }

    async solveCaptcha(page, url) {
        try {
            this.log("Starting CAPTCHA solve attempt for:", url);
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                this.log(`Attempt ${retryCount + 1} of ${maxRetries}`);

                try {
                    // Set up request interception
                    await page.setRequestInterception(true);

                    // Handle requests
                    page.on("request", async (request) => {
                        const requestUrl = request.url();
                        this.log("Intercepted request:", requestUrl);

                        // Block analytics and tracking requests
                        if (requestUrl.includes("analytics") || requestUrl.includes("tracking") || requestUrl.includes("beacon")) {
                            request.abort();
                            return;
                        }

                        // If it's the challenge script, respond with empty script
                        if (requestUrl.includes("t=")) {
                            this.log("Intercepting challenge script");
                            request.respond({
                                status: 200,
                                contentType: "application/javascript",
                                body: "console.log('Challenge bypassed');",
                            });
                            return;
                        }

                        request.continue();
                    });

                    // Navigate to the URL with cache disabled
                    await page.setCacheEnabled(false);
                    await page.reload({
                        waitUntil: "networkidle0",
                        timeout: 30000,
                    });

                    // Inject script to bypass challenge
                    await page.evaluate(() => {
                        // Remove any existing challenge scripts
                        const scripts = document.querySelectorAll('script[src*="t="]');
                        scripts.forEach((script) => script.remove());

                        // Clear any intervals that might be checking challenge status
                        for (let i = 1; i < 1000; i++) {
                            window.clearInterval(i);
                        }

                        // Override XMLHttpRequest
                        const originalXHR = window.XMLHttpRequest;
                        window.XMLHttpRequest = function () {
                            const xhr = new originalXHR();
                            const originalOpen = xhr.open;
                            xhr.open = function () {
                                originalOpen.apply(xhr, arguments);
                                xhr.setRequestHeader("User-Agent", "TestAgent");
                            };
                            return xhr;
                        };
                    });

                    // Wait for content to load
                    await delay(5000);

                    // Check if we have actual content
                    const content = await page.content();
                    const hasContent = content.length > 1000 && !content.includes("challenge");

                    if (hasContent) {
                        this.log("Successfully loaded content");
                        return true;
                    }
                } catch (error) {
                    this.log(`Attempt ${retryCount + 1} failed:`, error.message);
                } finally {
                    // Clean up request interception
                    await page.setRequestInterception(false);
                }

                retryCount++;
                await delay(3000);
            }

            throw new Error("Unable to solve CAPTCHA challenge after maximum retries");
        } catch (error) {
            this.log("Error solving CAPTCHA:", error);
            throw error;
        }
    }

    async checkForCaptcha(page) {
        try {
            if (!page || page.isClosed()) {
                throw new Error("Invalid or closed page");
            }

            const pageState = await page.evaluate(() => {
                return {
                    hasScript: !!document.querySelector('script[src*="t="]'),
                    hasReload: document.body.innerText.includes("location.reload"),
                    bodyLength: document.body.innerText.length,
                    url: window.location.href,
                    hasChallenge: document.body.innerText.includes("challenge") || document.body.innerText.length < 1000,
                };
            });

            this.log("CAPTCHA check state:", pageState);
            return pageState.hasScript || pageState.hasReload || pageState.hasChallenge;
        } catch (error) {
            this.log("Error checking for CAPTCHA:", error);
            return true;
        }
    }
}

module.exports = new CaptchaHandler();
