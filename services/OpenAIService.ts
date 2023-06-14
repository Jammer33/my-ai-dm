import axios from 'axios';
import { Method } from '../models/Methods';

// Endpoints for OpenAI API type
const enum OpenAIEndpoint {
    CHAT = '/chat/completions',
    EMBEDDINGS = '/embeddings',
}

const enum OpenAIModel {
    GPT3 = 'gpt-3.5-turbo-0613',
    GPT4 = 'gpt-4',
    ADA_EMBEDDING = 'text-embedding-ada-002',
}

export interface Message {
    content: string;
    role: string;
}
// declare data type for OpenAI API
interface OpenAIRequest {
    messages: Message[];
    model: OpenAIModel;
}

interface Choice {
    message: Message;
    index: number;
    finish_reason: string;
}

interface Usage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

interface OpenAIResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Choice[];
    usage: Usage;
}

// 

class OpenAIService {
    apiKey: any;
    baseUrl: string;
    model: any;

    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.baseUrl = 'https://api.openai.com/v1';
        this.model = process.env.OPENAI_MODEL;
    }

    async callApi(endpoint: OpenAIEndpoint, method: Method, data: OpenAIRequest) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
        };

        try {
            const response = await axios({
                method,
                url,
                headers,
                data,
            });
            const responseData = response.data as OpenAIResponse;
            return responseData.choices[0].message.content;

        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    public async getChat(messages: Message[]) {
        const endpoint = OpenAIEndpoint.CHAT;
        const method = Method.POST;
        const data = {
            messages: messages,
            model: this.model,
        };

        console.log(messages)
        
        return this.callApi(endpoint, method, data);
    }

    private messagesFormatter(messages: string[]) {
        return messages.map((message) => {
            return { content: message, role: "user" };
        });
    }
}

export default new OpenAIService();
