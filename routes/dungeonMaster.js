const express = require('express');
const router = express.Router();

// Get all users
router.get('/', (req, res) => {
  res.json({ message: 'This wil return the next conversation piece' });
});

// Get a specific user
router.get('/:id', (req, res) => {
  res.json({ message: `User with id ${req.params.id}` });
});

module.exports = router;
