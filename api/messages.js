
import { Redis } from "@upstash/redis";
import { getConnecterUser } from "../lib/session.js";

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(request, response) {
    try {
        if (request.method !== "GET") {
            return response.status(405).json({
                code: "METHOD_NOT_ALLOWED",
                message: "Méthode non autorisée",
            });
        }

        const user = await getConnecterUser(request);

        if (!user) {
            return response.status(401).json({
                code: "UNAUTHORIZED",
                message: "Session expirée",
            });
        }

        const senderId = Number(user.id);
        const targetId = Number(request.query?.targetId);

        if (
            !Number.isInteger(senderId) ||
            !Number.isInteger(targetId) ||
            targetId <= 0 ||
            targetId === senderId
        ) {
            return response.status(400).json({
                code: "INVALID_INPUT",
                message: "Identifiant du destinataire invalide",
            });
        }

        const firstId = Math.min(senderId, targetId);
        const secondId = Math.max(senderId, targetId);
        const conversationKey = `conversation:${firstId}:${secondId}`;

        const storedMessages = await redis.lrange(
            conversationKey,
            0,
            -1
        );

        const messages = storedMessages
    .map((item) =>
        typeof item === "string" ? JSON.parse(item) : item
    )
    .reverse();

return response.status(200).json(messages);
    } catch (error) {
        console.error("Erreur API messages :", error);

        return response.status(500).json({
            code: "INTERNAL_ERROR",
            message: "Impossible de récupérer les messages",
        });
    }
}
