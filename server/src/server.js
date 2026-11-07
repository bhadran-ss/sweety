import "dotenv/config";
import app from "./app.js";

const port = Number(process.env.PORT ?? 5000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("Port must be an integer b/w 1 and 65535");
}

app.listen(port, () => {
  console.log(`Sweety API is running under http://localhost:${port}`);
});
