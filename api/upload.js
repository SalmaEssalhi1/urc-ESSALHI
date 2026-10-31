import { put } from "@vercel/blob";
import { getConnecterUser } from "../lib/session.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo

const ALLOWED_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
};

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
                code: "INVALID_INPUT",
                message: "Fichier invalide.",
            });
        }

        if (!Object.hasOwn(ALLOWED_TYPES, contentType)) {
            return response.status(400).json({
                code: "INVALID_FILE_TYPE",
                message: "Formats acceptés : JPEG, PNG, GIF et WebP.",
            });
        }

        const base64Match = data.match(/^data:([^;]+);base64,(.+)$/);

        if (!base64Match || base64Match[1] !== contentType) {
            return response.status(400).json({
                code: "INVALID_DATA",
                message: "Le contenu du fichier est invalide.",
            });
        }

        const buffer = Buffer.from(base64Match[2], "base64");

        if (buffer.length === 0 || buffer.length > MAX_FILE_SIZE) {
            return response.status(400).json({
                code: "FILE_TOO_LARGE",
                message: "L'image doit peser au maximum 5 Mo.",
            });
        }

        const extension = ALLOWED_TYPES[contentType];
        const pathname = `chat/${crypto.randomUUID()}.${extension}`;

        const blob = await put(pathname, buffer, {
            access: "public",
            contentType,
            addRandomSuffix: false,
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        return response.status(201).json({
            message: "Image envoyée.",
            data: {
                url: blob.url,
                contentType,
                filename: filename.slice(0, 150),
                size: buffer.length,
            },
        });
    } catch (error) {
        console.error("Erreur API upload :", error);

        return response.status(500).json({
            code: "UPLOAD_FAILED",
            message: "Impossible d'envoyer l'image.",
        });
    }
}
