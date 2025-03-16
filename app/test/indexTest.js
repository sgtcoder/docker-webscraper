"use strict";

var assert = require("assert");
var page;
const puppeteer = require("puppeteer");
const lib = require("../lib");
const Promise = require("bluebird");
const PORT = 3050;
var browser;

const express = require("express");
const app = express();

describe("elastic service", function () {
    this.timeout(10000);
    let server;

    before(function (done) {
        (async () => {
            try {
                browser = await puppeteer.launch({
                    headless: "new",
                    args: ["--disable-dev-shm-usage", "--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-http2"],
                });

                app.get("/", (req, res) => {
                    res.send("<p>Hello World!</p>");
                });

                app.get("/agent", (req, res) => {
                    res.send(`<p>${req.headers["user-agent"]}</p>`);
                });

                server = app.listen(PORT, () => {
                    done();
                });
            } catch (error) {
                done(error);
            }
        })();
    });

    after(function (done) {
        (async () => {
            try {
                await browser.close();
                server.close(() => {
                    done();
                    process.exit(0); // Exit after all tests complete
                });
            } catch (error) {
                done(error);
                process.exit(1); // Exit with error code if something went wrong
            }
        })();
    });

    it("open page and check results", function (done) {
        (async () => {
            try {
                var result = await lib(browser, {
                    url: `http://127.0.0.1:${PORT}`,
                });

                var pages = await browser.pages();
                assert.equal(1, pages.length);
                assert.equal(result, "<html><head></head><body><p>Hello World!</p></body></html>");
                done();
            } catch (error) {
                done(error);
            }
        })();
    });

    it("open page and check page function results", async function test() {
        var result = await lib(browser, {
            url: `http://127.0.0.1:${PORT}`,
            pageFunction: function ($) {
                return $("p").text();
            },
        });

        var pages = await browser.pages();
        assert.equal(1, pages.length);

        assert.equal(result, "Hello World!");
    });

    it("open page and check user agent", async function test() {
        var result = await lib(browser, {
            url: `http://127.0.0.1:${PORT}/agent`,
            userAgent: "TestAgent",
            pageFunction: function ($) {
                return $("p").text();
            },
        });

        var pages = await browser.pages();
        assert.equal(1, pages.length);

        assert.equal(result, "TestAgent");
    });

    it("open page and check custom site", async function test() {
        var result = await lib(browser, {
            url: `https://betterprogramming.pub/how-to-share-a-postgres-socket-between-docker-containers-ad126e430de7`,
            userAgent: "TestAgent",
        });

        var pages = await browser.pages();

        assert.equal(1, pages.length);
    });

    it("open page and test costco", async function test() {
        var result = await lib(browser, {
            url: `https://www.costco.com/warehouse-locations/thomas-road-az-465.html`,
            userAgent: "TestAgent",
        });

        var pages = await browser.pages();

        assert.equal(1, pages.length);
    });
});
