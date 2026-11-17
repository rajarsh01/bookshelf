const { createApp } = require("./app");
const { createDb } = require("./db");

const port = process.env.PORT || 3000;
const db = createDb();

// The database container needs a few seconds to start, so retry before giving up.
async function start() {
  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      await db.init();
      break;
    } catch (err) {
      console.log(`Waiting for database (attempt ${attempt}/15): ${err.message}`);
      if (attempt === 15) process.exit(1);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  createApp(db).listen(port, () => console.log(`BookShelf is running on port ${port}`));
}

start();
