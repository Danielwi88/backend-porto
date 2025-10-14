import { makeApp, registerAllPaths, buildOpenApiDoc } from "api-core";
import swaggerUi from "swagger-ui-express";

const app = makeApp({ enable: { posts: true } });

registerAllPaths();
const openapiDoc = buildOpenApiDoc({ title: "Sociality API", version: "1.0.0" });

// Expose raw OpenAPI JSON for tooling or debugging
app.get("/openapi.json", (_req, res) => {
  res.header("Content-Type", "application/json");
  res.send(openapiDoc);
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc));

const port = Number(process.env.PORT ?? 9000);
app.listen(port, () => console.log(`Sociality API listening on ${port}`));
