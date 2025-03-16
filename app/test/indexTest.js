"use strict";

var assert = require("assert");
const axios = require("axios");
const PORT = 3050;

const { app, browserReadyEmitter } = require("../server"); // Use the combined server
let serverInstance;

describe("elastic service", function () {
    this.timeout(10000);

    before(function (done) {
        serverInstance = app.listen(PORT, () => {
            // Wait for the browser to be ready
            browserReadyEmitter.once("ready", done);
        });
    });

    after(function (done) {
        serverInstance.close(() => {
            done();
            process.exit(0); // Exit after all tests complete
        });
    });

    it("open page and check results", async function () {
        const response = await axios.get(`http://127.0.0.1:${PORT}/test`);
        assert.equal(response.data, "<p>Hello World!</p>");
    });

    it("open page and check page function results", async function () {
        const response = await axios.get(`http://127.0.0.1:${PORT}/test`);
        const result = /<p>(.*?)<\/p>/.exec(response.data)[1];
        assert.equal(result, "Hello World!");
    });

    it("open page and check user agent", async function () {
        const response = await axios.get(`http://127.0.0.1:${PORT}/agent`, {
            headers: { "User-Agent": "TestAgent" },
        });
        const result = /<p>(.*?)<\/p>/.exec(response.data)[1];
        assert.equal(result, "TestAgent");
    });

    it("open page and check custom site", async function () {
        const response = await axios.get(`https://betterprogramming.pub/how-to-share-a-postgres-socket-between-docker-containers-ad126e430de7`, {
            headers: { "User-Agent": "TestAgent" },
        });
        // Add any specific checks you need for this page
        assert(response.status === 200);
    });

    it("open page and test costco", async function () {
        const response = await axios.get(`https://www.costco.com/warehouse-locations/thomas-road-az-465.html`, {
            headers: { "User-Agent": "TestAgent" },
        });
        // Add any specific checks you need for this page
        assert(response.status === 200);
    });
});
