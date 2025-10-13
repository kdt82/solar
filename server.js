// Custom Next.js server to ensure the app binds to the public interface Railway expects.
const { createServer } = require("http");
const next = require("next");

const port = parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOST ?? "0.0.0.0";

console.log(`[Server] Starting Next.js server...`);
console.log(`[Server] Port: ${port}, Hostname: ${hostname}`);
console.log(`[Server] Node version: ${process.version}`);
console.log(`[Server] CWD: ${process.cwd()}`);

const app = next({
  dev: false,
  hostname,
  port,
});

const handle = app.getRequestHandler();

console.log(`[Server] Preparing Next.js app...`);

app
  .prepare()
  .then(() => {
    console.log(`[Server] Next.js app prepared successfully`);
    const server = createServer((req, res) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
      handle(req, res).catch((error) => {
        console.error("Error handling request", error);
        res.statusCode = 500;
        res.end("Internal Server Error");
      });
    });
    
    server.listen(port, hostname, () => {
      console.log(`Next.js server ready on http://${hostname}:${port}`);
      console.log(`[Server] Server is listening and ready to accept connections`);
    });

    server.on('error', (error) => {
      console.error(`[Server] Server error:`, error);
    });
  })
  .catch((error) => {
    console.error("Next.js failed to start", error);
    process.exit(1);
  });
