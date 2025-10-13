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
      console.log(`${new Date().toISOString()} ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
      handle(req, res).catch((error) => {
        console.error("Error handling request", error);
        res.statusCode = 500;
        res.end("Internal Server Error");
      });
    }).listen(port, hostname, () => {
      console.log(`Next.js server ready on http://${hostname}:${port}`);
    });
  })
  .catch((error) => {
    console.error("Next.js failed to start", error);
    process.exit(1);
  });
