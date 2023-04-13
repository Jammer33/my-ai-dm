import fetch from "node-fetch";
import { PineconeClient } from "@pinecone-database/pinecone";
import mysql from "mysql2/promise";

class MemoryModule {
  constructor(apiKey, pineconeApiKey, pineconeIndex, sqlConfig) {
    this.apiKey = apiKey;
    this.pinecone = new PineconeClient();
    this.pinecone.init({
      environment: "northamerica-northeast1-gcp",
      apiKey: pineconeApiKey,
    });
    this.index = pineconeIndex;

    this.sqlClient = mysql.createPool(sqlConfig);
  }

  async getEmbedding(text) {
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

  async store(text, importance) {
    const embedding = await this.getEmbedding(text);
    const timestamp = new Date();
    console.log(embedding)
    const [result] = await this.sqlClient.query(
      "INSERT INTO memories (content, importance, timestamp) VALUES (?, ?, ?)",
      [text, importance, timestamp]
    );

    const id = result.insertId;

    const index = this.pinecone.Index(this.index);
    await index.upsert({
      upsertRequest: {
        vectors: [{ id: id.toString(), values: embedding }],
      },
    });
  }

  async retrieve(query, n = 5) {
    const queryEmbedding = await this.getEmbedding(query);
    const index = this.pinecone.Index(this.index);
    const queryResponse = await index.query({
      queryRequest: {
        vector: queryEmbedding,
        topK: n,
        includeValues: true,
      },
    });

    const ids = queryResponse.matches.map((match) => match.id);
    const [rows] = await this.sqlClient.query(
      "SELECT id, content, importance FROM memories WHERE id IN (?)",
      [ids]
    );

    return rows.map((row) => ({
      content: row.content,
      importance: row.importance,
    }));
  }
}

export default MemoryModule;