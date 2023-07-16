import fetch from "node-fetch";
import { PineconeClient } from "@pinecone-database/pinecone";
import mysql, { OkPacket, RowDataPacket } from "mysql2/promise";
import { GetObjectCommand, GetObjectCommandOutput, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';

class MemoryService {
  apiKey: string;
  pinecone: PineconeClient;
  index: string;
  s3Client: S3Client;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    this.pinecone = new PineconeClient();
    this.pinecone.init({
      environment: "northamerica-northeast1-gcp",
      apiKey: process.env.PINECONE_API_KEY || "",
    });
    this.index = process.env.PINECONE_INDEX || "";
    this.s3Client = new S3Client({
      region: "us-east-2",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      }
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

  async storeS3Bucket(content: string, importance: number, timestamp: Date) {
    const key: string = uuidv4();
    const response = await this.s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || "",
      Body: JSON.stringify({
        content: content,
        importance: importance,
        timestamp: timestamp
      }),
      Key: key,
    }));
    return key;
  }

  async retrieveS3Bucket(eTag: string) {
    const response : GetObjectCommandOutput = await this.s3Client.send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || "",
      Key: eTag,
    })); 
    let body = await response.Body?.transformToString('utf-8') || "";
    const bodyObj = JSON.parse(body);
    return (bodyObj.content, bodyObj.importance, bodyObj.timestamp);
  }

  async store(text: string, importance: number, sessionToken?: string) {
    const embedding = await this.getEmbedding(text);
    const timestamp = new Date();

    const id = await this.storeS3Bucket(text, importance, timestamp);

    const index = this.pinecone.Index(this.index);
    await index.upsert({
      upsertRequest: {
        vectors: [{ id: id, values: embedding }],
        namespace: sessionToken,
      },
    });
  }

  async storeStory(text: string) {
    const embedding = await this.getEmbedding(text);
    const timestamp = new Date();

    const id = await this.storeS3Bucket(text, 0, timestamp);

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
    let res = [];
    for (let i = 0; i < ids.length; i++) {
      const result = await this.retrieveS3Bucket(ids[i]);
      res.push({
        content: result.content,
        importance: result.importance,
      });
    }
    console.log(res);
    return res;
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
    let res = [];
    for (let i = 0; i < ids.length; i++) {
      const result = await this.retrieveS3Bucket(ids[i]);
      res.push({
        content: result.content,
        importance: result.importance,
      });
    }
    console.log(res);
    return res;
  }
}

export default new MemoryService();