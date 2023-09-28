import fetch from "node-fetch";
import { PineconeClient } from "@pinecone-database/pinecone";
import mysql, { OkPacket, RowDataPacket } from "mysql2/promise";
import { GetObjectCommand, GetObjectCommandOutput, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';


class MemoryService {
  apiKey: string;
  pinecone: PineconeClient;
  index: string;
  sqlClient: mysql.Pool;
  s3Client: S3Client;
  bucketName: string;

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

    this.s3Client = new S3Client({
      region: "us-east-2",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      }
    });
    this.bucketName = process.env.S3_BUCKET_NAME || "ai-dungeon-master";
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

  async storeS3Bucket(content: string, importance: number, timestamp: Date) {
    const key: string = uuidv4();
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Body: JSON.stringify({
        content: content,
        importance: importance,
        timestamp: timestamp
      }),
      Key: key,
    }));
    return key;
  }

  async retrieveS3Bucket(key: string) {
    const response : GetObjectCommandOutput = await this.s3Client.send(new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })); 
    let body = await response.Body?.transformToString('utf-8') || "";
    return JSON.parse(body);
  }

  async store(text: string, importance: number, sessionToken: string) {
    return this.storeInternal(text, importance, sessionToken);
  }


  private async storeInternal(text: string, importance: number, namespace: string) {
    const embedding = await this.getEmbedding(text);
    const timestamp = new Date();

    const id = await this.storeS3Bucket(text, importance, timestamp);

    await this.sqlClient.query<OkPacket>(
      "INSERT INTO memories (s3Id, timestamp, sessionToken) VALUES (?, ?, ?)",
      [id, timestamp, namespace]
    );

    const index = this.pinecone.Index(this.index);
    await index.upsert({
      upsertRequest: {
        vectors: [{ id: id.toString(), values: embedding }],
        namespace: namespace,
      },
    });
  }

  async retrieveRelevant(query: string, n = 3, sessionToken: string) {
    const queryEmbedding = await this.getEmbedding(query);
    console.log("query embedding:", queryEmbedding);
    const index = this.pinecone.Index(this.index);
    console.log("index:", index);
    const queryResponse = await index.query({
      queryRequest: {
        vector: queryEmbedding,
        topK: n,
        includeValues: true,
        namespace: sessionToken,
      },
    });
    console.log("query response:", queryResponse);

    const ids = queryResponse?.matches?.map((match) => match.id) || [];
    if (ids.length === 0) {
      return [];
    }

    let res = [];
    for (let i = 0; i < ids.length; i++) {
      const result = await this.retrieveS3Bucket(ids[i]);
      res.push({
        content: result.content,
        importance: result.importance,
      });
    }
    
    return res;
  }

  async retrieveRecent(sessionToken: string) {
    const [rows] = await this.sqlClient.query<RowDataPacket[]>(
      "SELECT s3Id FROM memories WHERE sessionToken = ? ORDER BY timestamp DESC LIMIT 3",
      [sessionToken]
    );
    
    let res = [];
    for (let i = 0; i < rows.length; i++) {
      const result = await this.retrieveS3Bucket(rows[i].s3Id);
      res.push({
        content: result.content,
        importance: result.importance,
      });
    }
    return res;
  }

  async retrieveAll(sessionToken: string) {
    const [rows] = await this.sqlClient.query<RowDataPacket[]>(
      "SELECT s3Id FROM memories WHERE sessionToken = ? ORDER BY timestamp ASC",
      [sessionToken]
    );

    let res = [];
    for (let i = 0; i < rows.length; i++) {
      const result = await this.retrieveS3Bucket(rows[i].s3Id);
      res.push({
        content: result.content,
      });
    }
    return res;
  }


  async retrieveSessionState(sessionToken: string) {
    const [rows] = await this.sqlClient.query<RowDataPacket[]>(
      "SELECT content FROM session_state WHERE session_token = ?",
      [sessionToken]
    );

    return rows[0]?.content;
  }

  async storeSessionState(sessionToken: string, state: string) {
    const [result] = await this.sqlClient.query<OkPacket>(
      "INSERT INTO session_state (session_token, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = ?",
      [sessionToken, state, state]
    );

    return result.insertId;
  }
}

export default new MemoryService();
