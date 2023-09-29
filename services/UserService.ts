import { NewUser, UserLoginRequest, UserToken } from "../models/General";
import crypto from "crypto";
import bcrypt from "bcrypt";
import MemoryService from "./MemoryService";
import { generateUserToken } from "../utils/UserUtils";
import { BadRequestError, InternalServerError } from "../middleware/ErrorHandler";

class UserService {
    async signupUser(user: NewUser): Promise<UserToken> {
        // generate a random token with full alphabet and numbers not just hex no symbols
        const userToken = generateUserToken();


        // hash and salt the password
        const hashedPassword = bcrypt.hashSync(user.password, 10);
        // store the user in the database
        const createdUser = await MemoryService.storeUser({
            ...user,
            userToken,
            password: hashedPassword,
        });
        if (!createdUser) {
            throw new InternalServerError("Error creating user");
        }
        return await createdUser.userToken;
    }

    async loginUser(user: UserLoginRequest): Promise<UserToken> {
        // retrieve the user from the database
        const storedUser = await MemoryService.retrieveUser(user.email);
        if (!storedUser) {
            throw new BadRequestError("No user found with that email");
        }
        // compare the passwords
        const match = bcrypt.compareSync(user.password, storedUser.password);
        if (!match) {
            throw new BadRequestError("Password and email do not match");
        }

        return await storedUser.user_token;
    }
}

export default new UserService();