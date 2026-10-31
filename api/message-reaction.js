
import { Redis } from "@upstash/redis";
import { getConnecterUser } from "../lib/session.js";

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👏"];

export default async function handler(request, response) {
    try {
        if (request.method !== "POST") {
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
        const { targetId, messageId, emoji } = request.body ?? {};
        const recipientId = Number(targetId);

        if (
            !Number.isInteger(senderId) ||
            !Number.isInteger(recipientId) ||
            recipientId <= 0 ||
            recipientId === senderId ||
            typeof messageId !== "string" ||
            !messageId.trim() ||
            !ALLOWED_EMOJIS.includes(emoji)
        ) {
            return response.status(400).json({
                code: "INVALID_INPUT",
                message: "Données de réaction invalides",
            });
        }

        const firstId = Math.min(senderId, recipientId);
        const secondId = Math.max(senderId, recipientId);
        const conversationKey = `conversation:${firstId}:${secondId}`;

        const storedMessages = await redis.lrange(
            conversationKey,
            0,
            -1
        );

        const messages = storedMessages.map((item) =>
            typeof item === "string" ? JSON.parse(item) : item
        );

        const messageIndex = messages.findIndex(
            (message) => message.id === messageId
        );

        if (messageIndex === -1) {
            return response.status(404).json({
                code: "MESSAGE_NOT_FOUND",
                message: "Message introuvable",
            });
        }

        const message = messages[messageIndex];
        const messageRecipientId = Number(message.targetId);

        if (
            Number(message.senderId) !== senderId &&
            messageRecipientId !== senderId
        ) {
            return response.status(403).json({
                code: "FORBIDDEN",
                message: "Accès au message refusé",
            });
        }

        const reactions = message.reactions ?? {};
        const userId = senderId;
        let alreadyReactedWithSameEmoji = false;

        for (const existingEmoji of Object.keys(reactions)) {
            const users = reactions[existingEmoji] ?? [];

            if (
                existingEmoji === emoji &&
                users.some((id) => Number(id) === userId)
            ) {
                alreadyReactedWithSameEmoji = true;
            }

            reactions[existingEmoji] = users.filter(
                (id) => Number(id) !== userId
            );

            if (reactions[existingEmoji].length === 0) {
                delete reactions[existingEmoji];
            }
        }

        if (!alreadyReactedWithSameEmoji) {
            reactions[emoji] = [
                ...(reactions[emoji] ?? []),
                userId,
            ];
        }

        message.reactions = reactions;

        await redis.lset(
            conversationKey,
            messageIndex,
            JSON.stringify(message)
        );

        return response.status(200).json({
            message: "Réaction mise à jour",
            reactions,
        });
    } catch (error) {
        console.error("Erreur API message-reaction :", error);

        return response.status(500).json({
            code: "INTERNAL_ERROR",
            message: "Impossible de modifier la réaction",
        });
    }
}
