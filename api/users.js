import { sql } from "@vercel/postgres";
import {checkSession, unauthorizedResponse} from "../lib/session";

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    try {

        const connected = await checkSession(request);
        if (!connected) {
            console.log("Not connected");
            return unauthorizedResponse();
        }

        const currentUser = connected;
const { rowCount, rows } = await sql`
    SELECT
        user_id,
        username,
        avatar_url,
        TO_CHAR(last_login, 'DD/MM/YYYY HH24:MI') AS last_login
    FROM users
    WHERE user_id <> ${currentUser.id}
    ORDER BY last_login DESC
`;                if (rowCount === 0) {
            /* Vercel bug doesn't allow 204 response status */
            return new Response("[]", {
                status: 200,
                headers: {'content-type': 'application/json'},
            });
        } else {
            return new Response(JSON.stringify(rows), {
                status: 200,
                headers: {'content-type': 'application/json'},
            });
        }
    } catch (error) {
        console.log(error);
        return new Response(JSON.stringify(error), {
            status: 500,
            headers: {'content-type': 'application/json'},
        });
    }
};
