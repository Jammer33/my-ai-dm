import fetch from "node-fetch";
import { PineconeClient } from "@pinecone-database/pinecone";
import mysql, { OkPacket, RowDataPacket } from "mysql2/promise";

class MemoryService {
  apiKey: string;
  pinecone: PineconeClient;
  index: string;
  sqlClient: mysql.Pool;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    this.pinecone = new PineconeClient();
    this.pinecone.init({
      environment: "northamerica-northeast1-gcp",
      apiKey: process.env.PINECONE_API_KEY || "",
    });
    this.index = process.env.PINECONE_INDEX || "";

    this.sqlClient = mysql.createPool({
      host: 'localhost',
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: 'dungeon_master',
      port: 3306,
    });
  }

  async getEmbedding(text: string) {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-ada-002",
      }),
    });

    if (!response.ok) {
      console.error("Error getting embeddings:", response.statusText);
      return;
    }

    const result = await response.json();
    return result.data[0].embedding;
  }

  async store(text: string, importance: number, sessionToken?: string) {
    const embedding = await this.getEmbedding(text);
    const timestamp = new Date();

    const [result] = await this.sqlClient.query<OkPacket>(
      "INSERT INTO memories (content, importance, timestamp) VALUES (?, ?, ?)",
      [text, importance, timestamp]
    );

    const id = result.insertId;

    const index = this.pinecone.Index(this.index);
    await index.upsert({
      upsertRequest: {
        vectors: [{ id: id.toString(), values: embedding }],
        namespace: sessionToken,
      },
    });
  }

  async storeStory(text: string) {
    const embedding = await this.getEmbedding(text);
    const timestamp = new Date();

    const [result] = await this.sqlClient.query<OkPacket>(
      "INSERT INTO memories (content, importance, timestamp) VALUES (?, ?, ?)",
      [text, 0, timestamp]
    );

    const id = result.insertId;

    const index = this.pinecone.Index(this.index);
    await index.upsert({
      upsertRequest: {
        vectors: [{ id: id.toString(), values: embedding }],
        namespace: "story",
      },
    });
  }

  async retrieve(query: string, n = 3, sessionToken?: string) {
    const queryEmbedding = await this.getEmbedding(query);
    const index = this.pinecone.Index(this.index);
    const queryResponse = await index.query({
      queryRequest: {
        vector: queryEmbedding,
        topK: n,
        includeValues: true,
        namespace: sessionToken,
      },
    });


    const ids = queryResponse?.matches?.map((match) => match.id) || [];
    if (ids.length === 0) {
      return [];
    }
    const [rows] = await this.sqlClient.query<RowDataPacket[]>(
      "SELECT id, content, importance FROM memories WHERE id IN (?)",
      [ids]
    );

    return rows.map((row) => ({
      content: row.content,
      importance: row.importance,
    }));
  }

async retrieveStory(query: string, n = 3) {
    const queryEmbedding = await this.getEmbedding(query);
    const index = this.pinecone.Index(this.index);
    const queryResponse = await index.query({
      queryRequest: {
        vector: queryEmbedding,
        topK: n,
        includeValues: true,
        namespace: "story",
      },
    });


    const ids = queryResponse?.matches?.map((match) => match.id) || [];
    const [rows] = await this.sqlClient.query<RowDataPacket[]>(
      "SELECT id, content, importance FROM memories WHERE id IN (?)",
      [ids]
    );

    return rows.map((row) => ({
      content: row.content,
      importance: row.importance,
    }));
  }
}

export default new MemoryService();