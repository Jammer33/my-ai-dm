import express from 'express';
import DungeonMasterController from '../services/DungeonMasterController';

const router = express.Router();

// Get openai GPT3 response
router.get('/openai', async (req, res) => {
  var { message, sessionToken } = req.body;
  Promise.resolve(DungeonMasterController.getDMReply(message, sessionToken)).then((data) => {
    return res.json({ message: data });
  });
});

// initialize story
router.get('/story/init', async (req, res) => {
  var { characters, sessionToken } = req.body;
  Promise.resolve(DungeonMasterController.initStory(characters, sessionToken)).then((data) => {
    return res.json({ message: data });
  });
});

// Get a specific user
router.get('/:id', (req, res) => {
  res.json({ message: `User with id ${req.params.id}` });
});

export default router;
