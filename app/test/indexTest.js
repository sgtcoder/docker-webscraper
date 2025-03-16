"use strict";

var assert = require("assert");
const axios = require("axios");
const PORT = 3000;

const { app, browserReadyEmitter } = require("../server"); // Use the combined server
let serverInstance;
let connections = new Set();

describe("elastic service", function () {
    before(function (done) {
        serverInstance = app.listen(PORT, () => {
            // Wait for the browser to be ready
            browserReadyEmitter.once("ready", done);
        });

        serverInstance.on("connection", (conn) => {
            connections.add(conn);
            conn.on("close", () => {
                connections.delete(conn);
            });
        });
    });

    after(function (done) {
        serverInstance.close(() => {
            done();
            process.exit(0); // Exit after all tests complete
        });
    });

    it("open page and check results", async function () {
        const response = await axios.post(`http://127.0.0.1:${PORT}`, {
            url: `http://127.0.0.1:${PORT}/test`,
            userAgent: "TestAgent",
        });

        assert.equal(response.data.data, "<html><head></head><body><p>Hello World!</p></body></html>");
    });

    it("open page and check page function results", async function () {
        const response = await axios.post(`http://127.0.0.1:${PORT}`, {
            url: `http://127.0.0.1:${PORT}/test`,
            userAgent: "TestAgent",
            pageFunction: 'function($) { return $("p").text() }',
        });

        assert.equal(response.data.data, "Hello World!");
    });

    it("open page and check user agent", async function () {
        const response = await axios.post(`http://127.0.0.1:${PORT}`, {
            url: `http://127.0.0.1:${PORT}/agent`,
            userAgent: "TestAgent",
            pageFunction: 'function($) { return $("p").text() }',
        });

        assert.equal(response.data.data, "TestAgent");
    });

    it("open page and check custom site", async function () {
        const response = await axios.post(`http://127.0.0.1:${PORT}`, {
            url: `https://betterprogramming.pub/how-to-share-a-postgres-socket-between-docker-containers-ad126e430de7`,
            userAgent: "TestAgent",
        });
        // Add any specific checks you need for this page
        assert(response.status === 200);
    });

    it("open page and test costco", async function () {
        const response = await axios.post(`http://127.0.0.1:${PORT}`, {
            url: `https://www.costco.com/warehouse-locations/thomas-road-az-465.html`,
            userAgent: "TestAgent",
            pageFunction: 'function($) { return $("#service-collapse-1").html() }',
        });

        console.log(response.data);

        // Add any specific checks you need for this page
        assert(response.status === 200);
    });
});
