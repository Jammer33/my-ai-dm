import express from 'express';
import bodyParser from 'body-parser';
import { config } from 'dotenv';
(async () => {
  await config({path: '.env'});
})();
import MemoryModule from './memory/MemoryService';

import dungeonMasterRoutes from './routes/dungeonMaster';

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.use('/dungeon-master', dungeonMasterRoutes);


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.post("/memories", async (req, res) => {
  const { memory, importance } = req.body;
  await MemoryModule.store(memory, importance);
  res.sendStatus(201);
});

app.post("/memories/search", async (req, res) => {
  const { query } = req.body;
  const memories = await MemoryModule.retrieve(query);
  res.json(memories);
});

// route for getting story info
app.post("/story/search", async (req, res) => {
  const { query } = req.body;
  const memories = await MemoryModule.retrieveStory(query);
  res.json(memories);
});

// route for storing story info
app.post("/story/store", async (req, res) => {
  const { story } = req.body;
  await MemoryModule.storeStory(story);
  res.sendStatus(201);
});


function formatInputAndOutput(input: string, output: string) {
  return `User: ${input} DM: ${output}`;
}
