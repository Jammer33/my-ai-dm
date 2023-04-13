import express from 'express';
import bodyParser from 'body-parser';
import MemoryModule from './memory/memoryModule.js';
import { config } from 'dotenv';

(async () => {
  await config();
})();

const app = express();
const port = process.env.PORT || 3000;

const sqlConfig = {
  host: 'localhost',
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: 'dungeon_master',
  port: 3306,
};

const memoryModule = new MemoryModule(
  process.env.OPENAI_API_KEY,
  process.env.PINECONE_API_KEY,
  "dm-memory",
  sqlConfig,
  );


app.use(bodyParser.json());


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Example route for storing a memory
app.post("/memories", async (req, res) => {
  const { input, output, importance } = req.body;
  await memoryModule.store(formatInputAndOutput(input, output), importance);
  console.log(req.body)
  res.sendStatus(201);
});

// Example route for retrieving memories
app.post("/memories/search", async (req, res) => {
  console.log("TESTING")
  console.log(req.body)
  const { query } = req.body;
  const memories = await memoryModule.retrieve(query);
  res.json(memories);
});

function formatInputAndOutput(input, output) {
  return `User: ${input} DM: ${output}`;
}
