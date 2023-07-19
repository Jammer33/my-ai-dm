import express from 'express';
import bodyParser from 'body-parser';
import { config } from 'dotenv';
(async () => {
  await config({path: '.env'});
})();
import MemoryModule from './services/MemoryService';

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
