const { app, config } = require("./server");

app.listen(config.server.port, () => console.log(`App listening on port ${config.server.port}!`));
