
import { put } from "@vercel/blob";
import { sql } from "@vercel/postgres";
import { getConnecterUser } from "../lib/session.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

export default async function handler(request, response) {
    try {
        if (request.method !== "POST") {
            return response.status(405).json({
                message: "Méthode non autorisée.",
            });
        }

        const user = await getConnecterUser(request);

        if (!user) {
            return response.status(401).json({
                message: "Vous devez être connecté.",
            });
        }

        const { filename, contentType, data } = request.body ?? {};

        if (
            typeof filename !== "string" ||
            typeof contentType !== "string" ||
            typeof data !== "string"
        ) {
            return response.status(400).json({
                message: "Fichier invalide.",
            });
        }

        if (!Object.hasOwn(ALLOWED_TYPES, contentType)) {
            return response.status(400).json({
                message: "Formats acceptés : JPEG, PNG et WebP.",
            });
        }

        const match = data.match(/^data:([^;]+);base64,(.+)$/);

        if (!match || match[1] !== contentType) {
            return response.status(400).json({
                message: "Le contenu du fichier est invalide.",
            });
        }

        const buffer = Buffer.from(match[2], "base64");

        if (buffer.length === 0 || buffer.length > MAX_FILE_SIZE) {
            return response.status(400).json({
                message: "La photo doit peser au maximum 5 Mo.",
            });
        }

        const extension = ALLOWED_TYPES[contentType];
        const pathname = `profiles/${user.id}/${crypto.randomUUID()}.${extension}`;

        const blob = await put(pathname, buffer, {
            access: "public",
            contentType,
            addRandomSuffix: false,
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        const result = await sql`
            UPDATE users
            SET avatar_url = ${blob.url}
            WHERE user_id = ${user.id}
            RETURNING user_id, username, avatar_url
        `;

        if (result.rowCount === 0) {
            return response.status(404).json({
                message: "Utilisateur introuvable.",
            });
        }

        return response.status(200).json({
            message: "Photo de profil mise à jour.",
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Erreur API profile :", error);

        return response.status(500).json({
            message: "Impossible de mettre à jour la photo de profil.",
        });
    }
}
