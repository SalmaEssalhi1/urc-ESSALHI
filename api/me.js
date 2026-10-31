
import { sql } from "@vercel/postgres";
import { checkSession, unauthorizedResponse } from "../lib/session";

export const config = {
    runtime: "edge",
};

export default async function handler(request) {
    try {
        if (request.method !== "GET") {
            return new Response(
                JSON.stringify({ message: "Méthode non autorisée." }),
                {
                    status: 405,
                    headers: { "content-type": "application/json" },
                }
            );
        }

        const user = await checkSession(request);

        if (!user) {
            return unauthorizedResponse();
        }

        const { rows } = await sql`
            SELECT user_id, username, email, avatar_url
            FROM users
            WHERE user_id = ${user.id}
            LIMIT 1
        `;

        if (rows.length === 0) {
            return new Response(
                JSON.stringify({ message: "Utilisateur introuvable." }),
                {
                    status: 404,
                    headers: { "content-type": "application/json" },
                }
            );
        }

        return new Response(JSON.stringify(rows[0]), {
            status: 200,
            headers: { "content-type": "application/json" },
        });
    } catch (error) {
        console.error("Erreur API me :", error);

        return new Response(
            JSON.stringify({ message: "Impossible de récupérer le profil." }),
            {
                status: 500,
                headers: { "content-type": "application/json" },
            }
        );
    }
}
