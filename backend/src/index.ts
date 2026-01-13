import { Hono } from "hono";
import { cors } from "hono/cors";

import { crawlRoute } from "./routes/crawl";
import { analysisRoute } from "./routes/analysis";
import { cardsRoute } from "./routes/cards";
import { predictionsRoute } from "./routes/predictions";
import { sourcesRoute } from "./routes/sources";
import { learningRoute } from "./routes/learning";
import { pipelineRoute } from "./routes/pipeline";

const app = new Hono();
app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));

app.route("/crawl", crawlRoute);
app.route("/analysis", analysisRoute);
app.route("/cards", cardsRoute);
app.route("/predictions", predictionsRoute);
app.route("/sources", sourcesRoute);
app.route("/learning", learningRoute);
app.route("/pipeline", pipelineRoute);
app.route("/rules", rulesRoute);


export default app;
