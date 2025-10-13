// Custom Next.js server to ensure the app binds to the public interface Railway expects.
const { createServer } = require("http");
const next = require("next");

const port = parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOST ?? "0.0.0.0";

const app = next({
  dev: false,
  hostname,
  port,
});

const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      handle(req, res);
    }).listen(port, hostname, () => {
      console.log(`Next.js server ready on http://${hostname}:${port}`);
    });
  })
  .catch((error) => {
    console.error("Next.js failed to start", error);
    process.exit(1);
  });
