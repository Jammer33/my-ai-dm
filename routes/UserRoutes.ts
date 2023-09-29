import express from 'express';
import UserController from '../controllers/UserController';

const router = express.Router();

// signup user
router.post('/signup', async (req, res) => {
    var { username, password, email } = req.body;
    const response = await UserController.signupUser({username, password, email});
    return res.json({ message: response });
});

// login user
router.post('/login', async (req, res) => {
    var { email, password } = req.body;
    const response = await UserController.loginUser({email, password});
    return res.json({ message: response });
});

export default router;