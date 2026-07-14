import clientPromise from "./mongodb";
import { ObjectId, Collection } from "mongodb";

const DB_NAME = process.env.MONGODB_DB_NAME || process.env.MONGODB_DB || "likeway_ai";

export interface Persona {
    id?: string;
    userId: string;
    name: string;
    description: string;
    instructions: string;
    modelId: string;
    icon: string;
    isPublic: boolean;
    projectId?: string;
}

export async function getPersonas(userId: string) {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<Persona> = db.collection("personas");
    return await collection.find({ userId }).toArray();
}

export async function savePersona(persona: Persona) {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<Persona> = db.collection("personas");
    
    if (persona.id) {
        const { id, ...data } = persona;
        return await collection.updateOne({ _id: new ObjectId(id), userId: persona.userId }, { $set: data });
    } else {
        return await collection.insertOne(persona);
    }
}

export async function deletePersona(id: string, userId: string) {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<Persona> = db.collection("personas");
    return await collection.deleteOne({ _id: new ObjectId(id), userId });
}
