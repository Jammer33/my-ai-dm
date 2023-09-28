import OpenAIService, { Message } from '../services/OpenAIService';
import MemoryService from '../services/MemoryService';
import { Character } from '../models/Character';
import DungeonMasterService from '../services/DungeonMasterService';
import { Socket } from 'socket.io';

class DungeonMasterController {

    constructor() {}

    async getDMReply(message: string, sessionToken: string) { 
        const formattedContext = await DungeonMasterService.getFormattedContext(sessionToken, message);

        const response = await OpenAIService.getChat(formattedContext);
        
        MemoryService.store(this.formatMemory(message, response), 1, sessionToken);

        DungeonMasterService.updateState(this.formatMemory(message, response), sessionToken);
        
        return response;
    }

    async getDMReplyStreamed(message: string, sessionToken: string, socket: Socket) { 
        const formattedContext = await DungeonMasterService.getFormattedContext(sessionToken, message);

        const response = await OpenAIService.getChatStreamed(formattedContext, socket);

        MemoryService.store(this.formatMemory(message, response), 1, sessionToken);

        DungeonMasterService.updateState(this.formatMemory(message, response), sessionToken);
        
        return response;
    }

    async initStory(characters: Character[], sessionToken: string) {
        const charactersString = "The characters involved in this story are: " + characters.map((character) => character.name + " a " + character.race + " " + character.class).join(", ")
        const initialPrompt = DungeonMasterService.DungeonMasterPrompt + "\n" + charactersString + ".\n" + "Please begin the story by describing the setting and the current situation. Also explain to the characters how they got to where they are now. The setting should be somewhere within the Forgotten Realms.";

        const response = await OpenAIService.getChat([{ content: initialPrompt, role: "system" }]);

        MemoryService.store(this.formatMemory(initialPrompt, response), 1, sessionToken);

        const sessionInfo = charactersString + "\n" + response;

        DungeonMasterService.createNewState(sessionInfo, sessionToken);

        return response;
    }

    async initStoryStreamed(characters: Character[], sessionToken: string, socket: Socket) {
        const charactersString = "The characters involved in this story are: " + characters.map((character) => character.name + " a " + character.race + " " + character.class).join(", ")
        const initialPrompt = DungeonMasterService.DungeonMasterPrompt + "\n" + charactersString + ".\n" + "Please begin the story by describing the setting and the current situation.";

        const response = await OpenAIService.getChatStreamed([{ content: initialPrompt, role: "system" }], socket);

        MemoryService.store(this.formatMemory(initialPrompt, response), 1, sessionToken);

        const sessionInfo = charactersString + "\n" + response;

        DungeonMasterService.createNewState(sessionInfo, sessionToken);

        return response;
    }

    async getContext(sessionToken: string) {
        const [releventMemories, recentMemories, sessionState] = await Promise.all([
            MemoryService.retrieveRelevant("", 3, sessionToken),
            MemoryService.retrieveRecent(sessionToken),
            MemoryService.retrieveSessionState(sessionToken)
        ]);

        return DungeonMasterService.getFormattedContext(sessionToken, "");
    }

    async getSessionHistory(sessionToken: string) {
        const memories = await MemoryService.retrieveAll(sessionToken);

        return memories;
    }

    

    formatMemory(userMessage: string, dungeonMasterResponse: string, sessionState?: string) {
        return "[User Input]\n" + userMessage + "\n[DM Response]\n" + dungeonMasterResponse + "\n";
    }

}

export default new DungeonMasterController();
