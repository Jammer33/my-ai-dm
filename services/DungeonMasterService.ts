import OpenAIService, { Message } from './OpenAIService';
import MemoryService from '../memory/MemoryService';

class DungeonMasterService {

    DungeonMasterPrompt = "You are a dungeon master. You must guide your players through an engaging and fun story! Only tell players what they're actual in-game characters know, nothing more. This game is played in real-time. Reveal nothing about later events to players."

    constructor() {}

    async getDMReply(message: string, sessionToken: string) { 
        // const memories = await MemoryService.retrieveStory(message, 1);
        const memories = await MemoryService.retrieve(message, 5, sessionToken);
        const response = await OpenAIService.getChat(this.formateMessages(memories, message));

        MemoryService.store(this.formatMemory(message, response), 1, sessionToken);
        
        return response;
    }

    private formateMessages(memories: { content: string }[], message: string): Message[] {
        const memoryContext: string = "[Story Context]\n" + memories.map((memory) => memory.content).join(" ");
        const userInputer: string = "[User Input]\n" + message;
        const messages: Message[] = [
            { content: this.DungeonMasterPrompt, role: "system" },
            { content: memoryContext, role: "system" },
            { content: userInputer, role: "user" },
        ];

        return messages;
    }

    formatMemory(userMessage: string, dungeonMasterResponse: string) {
        return "[User Input]\n" + userMessage + "\n[DM Response]\n" + dungeonMasterResponse + "\n";
    }

}

export default new DungeonMasterService();
