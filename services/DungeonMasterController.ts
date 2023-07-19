import OpenAIService, { Message } from './OpenAIService';
import MemoryService from './MemoryService';
import { Character } from '../models/Character';
import DungeonMasterService from './DungeonMasterService';

class DungeonMasterController {

    private DungeonMasterPrompt = "You are a dungeon master. You must guide your players through an engaging and fun story! Only tell players what they're actual in-game characters know, nothing more. This game is played in real-time. Reveal nothing about later events to players. Please follow the rules of D&D. For example ask players to roll skill checks. Never roll for your players or make decisions for them. Never end the session unless the campaign has come to a finish."

    constructor() {}

    async getDMReply(message: string, sessionToken: string) { 
        console.log("sessionToken: " + sessionToken);
        const [releventMemories, recentMemories, sessionState] = await Promise.all([
            MemoryService.retrieveRelevant(message, 5, sessionToken),
            MemoryService.retrieveRecent(sessionToken),
            MemoryService.retrieveSessionState(sessionToken)
        ]);

        const response = await OpenAIService.getChat(this.formatMessages(recentMemories, releventMemories, message, sessionState));
        
        MemoryService.store(this.formatMemory(message, response), 1, sessionToken);

        DungeonMasterService.updateState(this.formatMemory(message, response), sessionToken);
        
        return response;
    }

    async initStory(characters: Character[], sessionToken: string) {
        const charactersString = "The characters involved in this story are: " + characters.map((character) => character.name + " a " + character.race + " " + character.class).join(", ")
        const initialPrompt = this.DungeonMasterPrompt + "\n" + charactersString + ".\n" + "Please begin the story by describing the setting and the current situation.";

        const response = await OpenAIService.getChat([{ content: initialPrompt, role: "system" }]);

        MemoryService.store(this.formatMemory(initialPrompt, response), 1, sessionToken);

        const sessionInfo = charactersString + "\n" + response;

        DungeonMasterService.createNewState(sessionInfo, sessionToken);

        return response;
    }

    private formatMessages(
        recentMemories: { content: string }[],
        relevantMemories: { content: string }[],
        message: string,
        state: string
        ): Message[] {
        const sessionState: string = "[Session State]\n" + state;
        const recentMemoryContext: string = "[Story Context]\n" + recentMemories.map((memory) => memory.content).join(" ");
        const relevantMemoryContext: string = "[Memory Context]\n" + relevantMemories.map((memory) => memory.content).join(" ");
        const userInput: string = "[User Input]\n" + message;
        const messages: Message[] = [
            { content: this.DungeonMasterPrompt, role: "system" },
            { content: sessionState, role: "system" },
            { content: relevantMemoryContext, role: "system" },
            { content: recentMemoryContext, role: "system" },
            { content: userInput, role: "user" },
        ];

        return messages;
    }

    formatMemory(userMessage: string, dungeonMasterResponse: string, sessionState?: string) {
        return "[User Input]\n" + userMessage + "\n[DM Response]\n" + dungeonMasterResponse + "\n";
    }

}

export default new DungeonMasterController();
