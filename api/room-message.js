
import { sql } from "@vercel/postgres";
import { Redis } from "@upstash/redis";
import { getConnecterUser } from "../lib/session.js";
import PushNotifications from "@pusher/push-notifications-server";

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

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

        const { roomId: rawRoomId, content } = request.body ?? {};
        const roomId = Number(rawRoomId);
        const senderId = Number(user.id);

        if (
            !Number.isInteger(senderId) ||
            !Number.isInteger(roomId) ||
            roomId <= 0 ||
            typeof content !== "string" ||
            !content.trim()
        ) {
            return response.status(400).json({
                code: "INVALID_INPUT",
                message: "Salon ou contenu du message invalide.",
            });
        }

        if (content.length > 5000) {
            return response.status(400).json({
                code: "MESSAGE_TOO_LONG",
                message: "Le message ne doit pas dépasser 5000 caractères.",
            });
        }

        const roomResult = await sql`
            SELECT room_id, name
            FROM rooms
            WHERE room_id = ${roomId}
        `;

        if (roomResult.rowCount === 0) {
            return response.status(404).json({
                code: "ROOM_NOT_FOUND",
                message: "Salon introuvable.",
            });
        }

        const room = roomResult.rows[0];

        const message = {
            id: crypto.randomUUID(),
            roomId,
            senderId,
            senderUsername: user.username,
            content: content.trim(),
            createdAt: new Date().toISOString(),
        };

        const roomKey = `room:${roomId}:messages`;

        await redis.lpush(roomKey, JSON.stringify(message));
        await redis.expire(roomKey, 86400);

        if (
            process.env.PUSHER_INSTANCE_ID &&
            process.env.PUSHER_SECRET_KEY
        ) {
            try {
                const { rows: recipients } = await sql`
                    SELECT external_id
                    FROM users
                    WHERE user_id <> ${senderId}
                `;

                const externalIds = recipients
                    .map((recipient) => recipient.external_id)
                    .filter(Boolean);

                if (externalIds.length > 0) {
                    const beamsClient = new PushNotifications({
                        instanceId: process.env.PUSHER_INSTANCE_ID,
                        secretKey: process.env.PUSHER_SECRET_KEY,
                    });

                    await beamsClient.publishToUsers(externalIds, {
                        web: {
                            notification: {
                                title: `${user.username} — ${room.name}`,
                                body: message.content,
                                deep_link: `http://localhost:3000/rooms/${roomId}`,
                            },
                        },
                    });
                }
            } catch (pushError) {
                console.error(
                    "Erreur notification salon :",
                    pushError
                );
            }
        }

        return response.status(201).json({
            message: "Message enregistré.",
            data: message,
        });
    } catch (error) {
        console.error("Erreur API room-message :", error);

        return response.status(500).json({
            code: "INTERNAL_ERROR",
            message: "Impossible d'envoyer le message dans le salon.",
        });
    }
}
