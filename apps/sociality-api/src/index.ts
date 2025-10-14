import { makeApp, registerAllPaths, buildOpenApiDoc } from "api-core";
import swaggerUi from "swagger-ui-express";

const app = makeApp({ enable: { posts: true } });

registerAllPaths();
const openapiDoc = buildOpenApiDoc({ title: "Sociality API", version: "1.0.0" });

// Dynamically set server URL so Swagger "Try it out" hits the current origin
app.get("/openapi.json", (req, res) => {
  const base =
    (process.env.PUBLIC_API_URL && process.env.PUBLIC_API_URL.trim()) ||
    `${(req.headers["x-forwarded-proto"] as string) || req.protocol}://${req.get("host")}`;

  // clone the generated doc and override servers per request
  const doc = { ...openapiDoc, servers: [{ url: base }] } as typeof openapiDoc;

  res.header("Content-Type", "application/json");
  res.send(doc);
});

// Serve Swagger UI for both local and production environments
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerUrl: `${process.env.PUBLIC_API_URL || ""}/openapi.json`,
    swaggerOptions: {
      persistAuthorization: true,
    }, 
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
  })
);

const port = Number(process.env.PORT ?? 9000);
app.listen(port, () => console.log(`Sociality API listening on ${port}`));
