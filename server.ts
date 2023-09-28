import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Server } from 'socket.io';
import { config } from 'dotenv';
import http from 'http';
(async () => {
  await config({path: '.env'});
})();
import MemoryModule from './services/MemoryService';

import dungeonMasterRoutes from './routes/dungeonMaster';
import socket from './routes/WebSocket';

const app = express();
const port = process.env.PORT || 3000;


app.use(bodyParser.json());
app.use(cors())

app.use('/dungeon-master', dungeonMasterRoutes);

app.get('/', (req, res) => {
  res.send('Hello World!');
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

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  }
});
socket(io);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


function formatInputAndOutput(input: string, output: string) {
  return `User: ${input} DM: ${output}`;
}
