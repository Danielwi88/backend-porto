import { makeApp } from "api-core";

const app = makeApp({ enable: { posts: true } });
const port = Number(process.env.PORT ?? 9000);
app.listen(port, () => console.log(`Sociality API listening on ${port}`));
