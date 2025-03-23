"use strict";

var assert = require("assert");
const axios = require("axios");
const { app, browserReadyEmitter, config } = require("../server");

let serverInstance;
let connections = new Set();

describe("elastic service", function () {
    // Increase timeout for all tests
    this.timeout(config.test.timeout);

    before(function (done) {
        serverInstance = app.listen(config.server.port, () => {
            browserReadyEmitter.once("ready", () => done());
        });

        serverInstance.on("connection", (conn) => {
            connections.add(conn);
            conn.on("close", () => connections.delete(conn));
        });
    });

    after(function (done) {
        // Close all existing connections
        connections.forEach((conn) => conn.destroy());

        // Close server and cleanup
        serverInstance.close(() => {
            connections.clear();
            done();
        });
    });

    it("open page and check results", async function () {
        const response = await axios.post(`http://127.0.0.1:${config.server.port}`, {
            url: `http://127.0.0.1:${config.server.port}/test`,
            userAgent: "TestAgent",
        });

        assert.equal(response.data.data, "<html><head></head><body><p>Hello World!</p></body></html>");
    });

    it("open page and check page function results", async function () {
        const response = await axios.post(`http://127.0.0.1:${config.server.port}`, {
            url: `http://127.0.0.1:${config.server.port}/test`,
            userAgent: "TestAgent",
            pageFunction: 'function($) { return $("p").text() }',
        });

        assert.equal(response.data.data, "Hello World!");
    });

    it("open page and check user agent", async function () {
        const response = await axios.post(`http://127.0.0.1:${config.server.port}`, {
            url: `http://127.0.0.1:${config.server.port}/agent`,
            userAgent: "TestAgent",
            pageFunction: 'function($) { return $("p").text() }',
        });

        assert.equal(response.data.data, "TestAgent");
    });

    it("open page and check custom site", async function () {
        const response = await axios.post(`http://127.0.0.1:${config.server.port}`, {
            url: `https://betterprogramming.pub/how-to-share-a-postgres-socket-between-docker-containers-ad126e430de7`,
            userAgent: "TestAgent",
        });

        assert(response.status === 200);
        assert(response.data.targetStatus === 200, `Expected target status 200 but got ${response.data.targetStatus}`);
    });

    it("open page and test costco", async function () {
        const response = await axios.post(`http://127.0.0.1:${config.server.port}`, {
            url: `https://www.costco.com/warehouse-locations/thomas-road-az-465.html`,
            pageFunction: 'function($) { return $("#service-collapse-1").html() }',
            viewport: config.browser.defaultViewport,
        });

        assert(response.status === 200, `Expected status 200 but got ${response.status}`);
    });
});
