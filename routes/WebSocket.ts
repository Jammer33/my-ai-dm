import { Server } from "socket.io";
import DungeonMasterController from "../controllers/DungeonMasterController";

const socket = (io: Server) => {
    io.on("connection", (socket) => {
        console.log("a user connected");

        socket.on("disconnect", () => {
            console.log("user disconnected");
        }); 

        socket.on("message", (message, sessionToken) => {
            console.log("sessionToken: " + sessionToken);
            DungeonMasterController.getDMReplyStreamed(message, sessionToken, socket);
        });

        socket.on("newGame", (characters, sessionToken) => {
            console.log("sessionToken: " + sessionToken);
            DungeonMasterController.initStoryStreamed(characters, sessionToken, socket);
        });
    });
}

export default socket;