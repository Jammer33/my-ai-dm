import express from 'express';
import DungeonMasterService from '../services/DungeonMasterService';

const router = express.Router();

// Get openai GPT3 response
router.post('/openai', async (req, res) => {
  Promise.resolve(DungeonMasterService.getDMReply(req.body.message, req.body.sessionToken)).then((data) => {
    return res.json({ message: data });
  });
});

// Get a specific user
router.get('/:id', (req, res) => {
  res.json({ message: `User with id ${req.params.id}` });
});

export default router;
