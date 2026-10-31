
import { Redis } from "@upstash/redis";
import { getConnecterUser } from "../lib/session.js";

export const config = { runtime: "edge" };

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(request) {
    try {
        if (request.method !== "POST") {
            return new Response(
                JSON.stringify({
                    code: "METHOD_NOT_ALLOWED",
                    message: "Méthode non autorisée",
                }),
                {
                    status: 405,
                    headers: { "content-type": "application/json" },
                }
            );
        }

        const user = await getConnecterUser(request);

        if (!user) {
            return new Response(
                JSON.stringify({
                    code: "UNAUTHORIZED",
                    message: "Session expirée",
                }),
                {
                    status: 401,
                    headers: { "content-type": "application/json" },
                }
            );
        }

        const body = await request.json();
        const { roomId, messageId, emoji } = body;

        const allowedEmojis = ["👍", "❤️", "😂", "😮", "😢", "👏"];

        if (
            !Number.isInteger(roomId) ||
            roomId <= 0 ||
            typeof messageId !== "string" ||
            !messageId.trim() ||
            !allowedEmojis.includes(emoji)
        ) {
            return new Response(
                JSON.stringify({
                    code: "INVALID_INPUT",
                    message: "Données de réaction invalides",
                }),
                {
                    status: 400,
                    headers: { "content-type": "application/json" },
                }
            );
        }

        const messagesKey = `room:${roomId}:messages`;
        const storedMessages = await redis.lrange(messagesKey, 0, -1);

        const messages = storedMessages.map((item) =>
            typeof item === "string" ? JSON.parse(item) : item
        );

        if (!messages.some((message) => message.id === messageId)) {
            return new Response(
                JSON.stringify({
                    code: "MESSAGE_NOT_FOUND",
                    message: "Message introuvable",
                }),
                {
                    status: 404,
                    headers: { "content-type": "application/json" },
                }
            );
        }

        const userId = user.id ?? user.externalId ?? user.username;
        const reactionsKey =
            `room:${roomId}:message:${messageId}:reactions`;

        const reactions = (await redis.get(reactionsKey)) ?? {};

        // Retirer d'abord la réaction précédente de cet utilisateur.
        let alreadyReactedWithSameEmoji = false;

        for (const existingEmoji of Object.keys(reactions)) {
            const users = reactions[existingEmoji] ?? [];

            if (
                existingEmoji === emoji &&
                users.some((id) => String(id) === String(userId))
            ) {
                alreadyReactedWithSameEmoji = true;
            }

            reactions[existingEmoji] = users.filter(
                (id) => String(id) !== String(userId)
            );

            if (reactions[existingEmoji].length === 0) {
                delete reactions[existingEmoji];
            }
        }

        // Cliquer à nouveau sur le même emoji retire la réaction.
        // Sinon, ajouter uniquement le nouvel emoji.
        if (!alreadyReactedWithSameEmoji) {
            reactions[emoji] = [
                ...(reactions[emoji] ?? []),
                userId,
            ];
        }

        if (Object.keys(reactions).length === 0) {
            await redis.del(reactionsKey);
        } else {
            await redis.set(reactionsKey, reactions, { ex: 86400 });
        }

        return new Response(
            JSON.stringify({
                message: "Réaction mise à jour",
                reactions,
            }),
            {
                status: 200,
                headers: { "content-type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Erreur API room-reaction :", error);

        return new Response(
            JSON.stringify({
                code: "INTERNAL_ERROR",
                message: "Erreur lors de la mise à jour de la réaction",
            }),
            {
                status: 500,
                headers: { "content-type": "application/json" },
            }
        );
    }
}
