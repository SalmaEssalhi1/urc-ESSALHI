
import { sql } from "@vercel/postgres";
import { Redis } from "@upstash/redis";
import { checkSession, unauthorizedResponse } from "../lib/session";

export const config = {
    runtime: "edge",
};

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(request) {
    try {
        if (request.method !== "GET") {
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

        const connected = await checkSession(request);

        if (!connected) {
            return unauthorizedResponse();
        }

        const url = new URL(request.url);
        const roomId = Number(url.searchParams.get("roomId"));

        if (!Number.isInteger(roomId) || roomId <= 0) {
            return new Response(
                JSON.stringify({
                    code: "INVALID_INPUT",
                    message: "Identifiant du salon invalide.",
                }),
                {
                    status: 400,
                    headers: { "content-type": "application/json" },
                }
            );
        }

        const roomResult = await sql`
            SELECT room_id
            FROM rooms
            WHERE room_id = ${roomId}
        `;

        if (roomResult.rowCount === 0) {
            return new Response(
                JSON.stringify({
                    code: "ROOM_NOT_FOUND",
                    message: "Salon introuvable.",
                }),
                {
                    status: 404,
                    headers: { "content-type": "application/json" },
                }
            );
        }

        const storedMessages = await redis.lrange(
            `room:${roomId}:messages`,
            0,
            -1
        );

        
const messages = storedMessages
    .map((item) =>
        typeof item === "string" ? JSON.parse(item) : item
    )
    .reverse();

const messagesWithReactions = await Promise.all(
    messages.map(async (message) => {
        const reactionsKey =
            `room:${roomId}:message:${message.id}:reactions`;

        const reactions = (await redis.get(reactionsKey)) ?? {};

        return {
            ...message,
            reactions,
        };
    })
);

return new Response(JSON.stringify(messagesWithReactions), {

            status: 200,
            headers: { "content-type": "application/json" },
        });
    } catch (error) {
        console.error("Erreur API room-messages :", error);

        return new Response(
            JSON.stringify({
                code: "INTERNAL_ERROR",
                message: "Impossible de récupérer les messages du salon.",
            }),
            {
                status: 500,
                headers: { "content-type": "application/json" },
            }
        );
    }
}
