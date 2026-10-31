
import { sql } from "@vercel/postgres";
import { checkSession, unauthorizedResponse } from "../lib/session";
import { Redis } from "@upstash/redis";
import {
    arrayBufferToBase64,
    stringToArrayBuffer,
} from "../lib/base64";

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

export const config = {
    runtime: "edge",
};

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
    });
}

export default async function handler(request) {
    try {
        if (request.method !== "PATCH") {
            return jsonResponse(
                { message: "Méthode non autorisée." },
                405
            );
        }

        const user = await checkSession(request);

        if (!user) {
            return unauthorizedResponse();
        }

        const {
            username,
            email,
            currentPassword,
            newPassword,
        } = await request.json();

        if (
            typeof username !== "string" ||
            typeof email !== "string" ||
            !username.trim() ||
            !email.trim()
        ) {
            return jsonResponse({
                message: "Le nom d'utilisateur et l'e-mail sont obligatoires.",
            }, 400);
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanUsername.length > 50 || cleanEmail.length > 255) {
            return jsonResponse({
                message: "Nom ou e-mail trop long.",
            }, 400);
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return jsonResponse({
                message: "Adresse e-mail invalide.",
            }, 400);
        }

        if (
            newPassword !== undefined &&
            newPassword !== "" &&
            (typeof newPassword !== "string" ||
                newPassword.length < 8 ||
                newPassword.length > 72)
        ) {
            return jsonResponse({
                message: "Le nouveau mot de passe doit contenir entre 8 et 72 caractères.",
            }, 400);
        }

        const currentResult = await sql`
            SELECT username, password
            FROM users
            WHERE user_id = ${user.id}
            LIMIT 1
        `;

        if (currentResult.rows.length === 0) {
            return jsonResponse({
                message: "Utilisateur introuvable.",
            }, 404);
        }

        const oldUsername = currentResult.rows[0].username;
        let passwordHash = currentResult.rows[0].password;

        const passwordIsChanging =
            typeof newPassword === "string" && newPassword.length > 0;

        const identityIsChanging =
            cleanUsername !== oldUsername;

        // Vérifier le mot de passe actuel pour toute modification
        // du nom, de l'e-mail ou du mot de passe.
        if (
            identityIsChanging ||
            cleanEmail !== (user.email || "").toLowerCase() ||
            passwordIsChanging
        ) {
            if (
                typeof currentPassword !== "string" ||
                !currentPassword
            ) {
                return jsonResponse({
                    message: "Entrez votre mot de passe actuel pour confirmer les modifications.",
                }, 400);
            }

            const currentHash = arrayBufferToBase64(
                await crypto.subtle.digest(
                    "SHA-256",
                    stringToArrayBuffer(oldUsername + currentPassword)
                )
            );

            if (currentHash !== passwordHash) {
                return jsonResponse({
                    message: "Mot de passe actuel incorrect.",
                }, 400);
            }
        }

        // Le nouveau mot de passe n'est modifié que s'il est renseigné.
        // Recalculer le hash si le mot de passe OU le nom change.
if (passwordIsChanging || identityIsChanging) {
    const passwordToHash = passwordIsChanging
        ? newPassword
        : currentPassword;

    passwordHash = arrayBufferToBase64(
        await crypto.subtle.digest(
            "SHA-256",
            stringToArrayBuffer(cleanUsername + passwordToHash)
        )
    );
}

        const result = await sql`
            UPDATE users
            SET username = ${cleanUsername},
                email = ${cleanEmail},
                password = ${passwordHash}
            WHERE user_id = ${user.id}
            RETURNING user_id, username, email, avatar_url
        `;

        const updatedProfile = result.rows[0];

        const authorization = request.headers.get("Authorization");
        const match = authorization?.match(/^Bearer\s+(\S+)$/i);

        if (!match) {
            return unauthorizedResponse();
        }

        const token = match[1];

        const updatedUser = {
            ...user,
            id: updatedProfile.user_id,
            username: updatedProfile.username,
            email: updatedProfile.email,
            avatar_url: updatedProfile.avatar_url,
        };

        await redis.set(token, updatedUser, { ex: 3600 });

        const usersInfo = {};
        usersInfo[updatedProfile.user_id] = updatedUser;
        await redis.hset("users", usersInfo);

        return jsonResponse({
            message: "Profil mis à jour.",
            data: updatedProfile,
        });
    } catch (error) {
        console.error("Erreur update-profile :", error);

        if (error?.code === "23505") {
            return jsonResponse({
                message: "Ce nom d'utilisateur ou cet e-mail est déjà utilisé.",
            }, 409);
        }

        return jsonResponse({
            message: "Impossible de mettre à jour le profil.",
        }, 500);
    }
}
