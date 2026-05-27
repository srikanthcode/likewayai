import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";

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
    const db = client.db("zynthex_ai");
    const collection = db.collection<Persona>("personas");
    return await collection.find({ userId }).toArray();
}

export async function savePersona(persona: Persona) {
    const client = await clientPromise;
    const db = client.db("zynthex_ai");
    const collection = db.collection<Persona>("personas");
    
    if (persona.id) {
        const { id, ...data } = persona;
        return await collection.updateOne({ _id: new ObjectId(id) }, { $set: data });
    } else {
        return await collection.insertOne(persona);
    }
}

export async function deletePersona(id: string) {
    const client = await clientPromise;
    const db = client.db("zynthex_ai");
    const collection = db.collection("personas");
    return await collection.deleteOne({ _id: new ObjectId(id) });
}
