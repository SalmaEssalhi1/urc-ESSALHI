
import { sql } from "@vercel/postgres";
import { Redis } from "@upstash/redis";
import { arrayBufferToBase64, stringToArrayBuffer } from "../lib/base64";

export const config = {
    runtime: "edge",
};

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

        const { username, email, password } = await request.json();

        if (
            typeof username !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !username.trim() ||
            !email.trim() ||
            !password
        ) {
            return new Response(
                JSON.stringify({
                    code: "INVALID_INPUT",
                    message: "Tous les champs sont obligatoires.",
                }),
                {
                    status: 400,
                    headers: { "content-type": "application/json" },
                }
            );
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanUsername.length > 50 || cleanEmail.length > 255) {
            return new Response(
                JSON.stringify({
                    code: "INVALID_INPUT",
                    message: "L'identifiant ou l'e-mail est trop long.",
                }),
                {
                    status: 400,
                    headers: { "content-type": "application/json" },
                }
            );
        }

        if (password.length > 72) {
            return new Response(
                JSON.stringify({
                    code: "INVALID_INPUT",
                    message: "Le mot de passe est trop long.",
                }),
                {
                    status: 400,
                    headers: { "content-type": "application/json" },
                }
            );
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(cleanEmail)) {
            return new Response(
                JSON.stringify({
                    code: "INVALID_EMAIL",
                    message: "L'adresse e-mail n'est pas valide.",
                }),
                {
                    status: 400,
                    headers: { "content-type": "application/json" },
                }
            );
        }

        const passwordHash = await crypto.subtle.digest(
            "SHA-256",
            stringToArrayBuffer(cleanUsername + password)
        );

        const hashed64 = arrayBufferToBase64(passwordHash);
        const externalId = crypto.randomUUID();

        const result = await sql`
            INSERT INTO users (username, password, email, created_on, external_id)
            VALUES (${cleanUsername}, ${hashed64}, ${cleanEmail}, NOW(), ${externalId})
            ON CONFLICT DO NOTHING
            RETURNING user_id
        `;

        if (result.rowCount !== 1) {
            return new Response(
                JSON.stringify({
                    code: "DUPLICATE_USER",
                    message: "Cet identifiant ou cette adresse e-mail est déjà utilisé.",
                }),
                {
                    status: 409,
                    headers: { "content-type": "application/json" },
                }
            );
        }

        const newUserId = result.rows[0].user_id;

        // Pré-remplir le cache Redis pour que l'utilisateur soit joignable immédiatement
        try {
            await redis.hset("users", {
                [newUserId]: {
                    id: newUserId,
                    username: cleanUsername,
                    email: cleanEmail,
                    externalId: externalId,
                },
            });
        } catch (redisError) {
            console.error("Erreur mise à jour Redis à l'inscription :", redisError);
        }

        return new Response(
            JSON.stringify({
                message: "Inscription réussie.",
                user_id: newUserId,
            }),
            {
                status: 201,
                headers: { "content-type": "application/json" },
            }
        );
    } catch (error) {
        console.error(error);

        return new Response(
            JSON.stringify({
                code: "INTERNAL_ERROR",
                message: "Une erreur est survenue lors de l'inscription.",
            }),
            {
                status: 500,
                headers: { "content-type": "application/json" },
            }
        );
    }
}
