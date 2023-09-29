import 'express-async-errors'; 
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
import userRoutes from './routes/UserRoutes';
import socket from './routes/WebSocket';
import { BadRequestError, ErrorHandler } from './middleware/ErrorHandler';


const app = express();
const port = process.env.PORT || 3000;


app.use(bodyParser.json());
app.use(cors())

app.use('/dungeon-master', dungeonMasterRoutes);
app.use('/user', userRoutes);

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

app.get('/test-error', async (req, res) => {
  // This is a dummy async operation to simulate asynchronous errors.
  await new Promise((resolve, reject) => setTimeout(() => reject(new BadRequestError("Test Error!")), 1000));
});


const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  }
});
socket(io);

app.use(ErrorHandler);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
