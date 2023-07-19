import MemoryService from "./MemoryService";
import OpenAIService from "./OpenAIService";

class DungeonMasterService {
    // Prompt get iteratively update the session state with new story information and return the new state
    private firstPrompt = "The following is the current state of a Dungeons & Dragons campaign."
    private secondPrompt = "The following is new info on what just happened in the story \n NEW INFO"
    private thirdPrompt = "YOUR ROLE \nIt is your job to update the current state of the story with the new story information provided. Please include important information about the player characters, quests, locations, items, NPCs etc. Also keep track of the current time of day, weather, and current location of the characters. Feel free to update and delete old data as it becomes irrelevant. Include nothing except the new state. You have full creative control. Feel free to remove old info, update anything, add new sections, etc. The Dungeon Master will rely on what you put here to keep track of the story and gameplay. \n Please provide the updated game state below. Starting with \"CURRENT STATE\"..."

    constructor() {}

    async updateState(newStory: string, sessionToken: string) {
        var oldState = await MemoryService.retrieveSessionState(sessionToken);
        var newState = await OpenAIService.getChat(
            [
                { content: this.firstPrompt, role: "system" },
                { content: oldState, role: "system" },
                { content: this.secondPrompt, role: "system" },
                { content: newStory, role: "system" },
                { content: this.thirdPrompt, role: "system" },
            ]
        );
        await MemoryService.storeSessionState(sessionToken, newState);
        return newState;
    }

    private firstNewStatePrompt = "The following is the beginning of a new Dungeons & Dragons campaign."
    private secondNewStatePrompt = "It is your job to create the STATE of the story with the story information provided. Please include important information about the player characters, quests, locations, items, NPCs etc. Also keep track of the current time of day, weather, and current location of the characters. You have full creative control on what is stored here but remember that the Dungeon Master will rely on what you put here to keep track of the story and gameplay. \n Please provide the game state below. Starting with \"CURRENT STATE\"..."

    async createNewState(newStory: string, sessionToken: string) {
        var newState = await OpenAIService.getChat(
            [
                { content: this.firstNewStatePrompt, role: "system" },
                { content: newStory, role: "system" },
                { content: this.secondNewStatePrompt, role: "system" },
            ]
        );
        await MemoryService.storeSessionState(sessionToken, newState);
        return newState;
    }

}

export default new DungeonMasterService();