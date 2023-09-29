import { InternalServerError } from "../middleware/ErrorHandler";
import { NewUser, UserLoginRequest } from "../models/General";
import UserService from "../services/UserService";

class DungeonMasterController {

    constructor() {}

    async signupUser(user: NewUser) {
        const userToken = await UserService.signupUser(user);
        if (!userToken) {
            throw new InternalServerError("Error creating user");
        }
        return "User created successfully with userToken: " + userToken;
    }

    async loginUser(user: UserLoginRequest) {
        const userToken = await UserService.loginUser(user);
        if (!userToken) {
            throw new InternalServerError("Error logging in user");
        }
        return "User logged in successfully with userToken: " + userToken;
    }

}

export default new DungeonMasterController();