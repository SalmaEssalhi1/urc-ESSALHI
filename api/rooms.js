
import { sql } from "@vercel/postgres";
import { checkSession, unauthorizedResponse } from "../lib/session";

export const config = {
    runtime: "edge",
};

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

        const { rows } = await sql`
            SELECT
                room_id,
                name,
                TO_CHAR(created_on, 'DD/MM/YYYY HH24:MI') AS created_on
            FROM rooms
            ORDER BY name
        `;

        return new Response(JSON.stringify(rows), {
            status: 200,
            headers: { "content-type": "application/json" },
        });
    } catch (error) {
        console.error("Erreur API rooms :", error);

        return new Response(
            JSON.stringify({
                code: "INTERNAL_ERROR",
                message: "Impossible de récupérer les salons.",
            }),
            {
                status: 500,
                headers: { "content-type": "application/json" },
            }
        );
    }
}
