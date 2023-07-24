import express from "express";
import bodyParser from "body-parser";
import { config } from "dotenv";
import cors from "cors";
import mongoose from "mongoose";

import authRoutes from "./routes/auth";

(async () => {
  await config({ path: ".env" });
})();
import MemoryModule from "./services/MemoryService";

import dungeonMasterRoutes from "./routes/dungeonMaster";

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cors());

app.use("/dungeon-master", dungeonMasterRoutes);

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/memories", async (req, res) => {
  const { memory, importance, sessionToken } = req.body;
  await MemoryModule.store(memory, importance, sessionToken);
  res.sendStatus(201);
});

app.post("/memories/search", async (req, res) => {
  const { query, sessionToken } = req.body;
  const memories = await MemoryModule.retrieveRecent(sessionToken);
  res.json(memories);
});

function formatInputAndOutput(input: string, output: string) {
  return `User: ${input} DM: ${output}`;
}

const CONNECTION_URL =
  "mongodb+srv://vanshmago9:CzUABSQeZzj6G2Ye@cluster0.ktz6ecl.mongodb.net/?retryWrites=true&w=majority";

mongoose
  .connect(CONNECTION_URL)
  .then(() =>
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    })
  )
  .catch((error) => console.log(error.message));
