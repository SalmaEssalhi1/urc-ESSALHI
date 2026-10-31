
import { Redis } from "@upstash/redis";
import { getConnecterUser } from "../lib/session.js";
import PushNotifications from "@pusher/push-notifications-server";

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(request, response) {
    try {
        // Vérifier la méthode HTTP
        if (request.method !== "POST") {
            return response.status(405).json({
                code: "METHOD_NOT_ALLOWED",
                message: "Méthode non autorisée",
            });
        }

        // Vérifier l'utilisateur connecté
        const user = await getConnecterUser(request);

        if (!user) {
            return response.status(401).json({
                code: "UNAUTHORIZED",
                message: "Session expirée",
            });
        }

        // Récupérer les données du message
        const { targetId, content } = request.body ?? {};

        const senderId = Number(user.id);
        const recipientId = Number(targetId);

        // Valider le destinataire et le contenu
        if (
            !Number.isInteger(senderId) ||
            !Number.isInteger(recipientId) ||
            recipientId <= 0 ||
            recipientId === senderId ||
            typeof content !== "string" ||
            !content.trim()
        ) {
            return response.status(400).json({
                code: "INVALID_INPUT",
                message: "Destinataire ou contenu du message invalide",
            });
        }

        if (content.length > 5000) {
            return response.status(400).json({
                code: "MESSAGE_TOO_LONG",
                message: "Le message ne doit pas dépasser 5000 caractères",
            });
        }

        // Vérifier que le destinataire existe
        const targetUser = await redis.hget(
            "users",
            String(recipientId)
        );

        if (!targetUser) {
            return response.status(404).json({
                code: "USER_NOT_FOUND",
                message: "Destinataire introuvable",
            });
        }

        // Construire la clé de conversation
        const firstId = Math.min(senderId, recipientId);
        const secondId = Math.max(senderId, recipientId);
        const conversationKey = `conversation:${firstId}:${secondId}`;

        // Créer le message
        const message = {
            id: crypto.randomUUID(),
            senderId,
            senderUsername: user.username,
            targetId: recipientId,
            content: content.trim(),
            createdAt: new Date().toISOString(),
        };

        // Enregistrer le message dans Redis
        await redis.lpush(
            conversationKey,
            JSON.stringify(message)
        );

        // Conserver la conversation pendant 24 heures
        await redis.expire(conversationKey, 86400);

        // Envoyer une notification push au destinataire
        if (
            process.env.PUSHER_INSTANCE_ID &&
            process.env.PUSHER_SECRET_KEY &&
            targetUser.externalId
        ) {
            try {
                const beamsClient = new PushNotifications({
                    instanceId: process.env.PUSHER_INSTANCE_ID,
                    secretKey: process.env.PUSHER_SECRET_KEY,
                });

                await beamsClient.publishToUsers(
                    [targetUser.externalId],
                    {
                        web: {
                            notification: {
                                title: `Nouveau message de ${user.username}`,
                                body: message.content,
                                deep_link: `http://localhost:3000/messages/user/${senderId}`,
                            },
                        },
                    }
                );

                console.log(
                    "Notification Pusher envoyée au destinataire :",
                    recipientId
                );
            } catch (pushError) {
                // Une erreur push ne doit pas empêcher
                // l'enregistrement du message
                console.error(
                    "Erreur notification Pusher :",
                    pushError
                );
            }
        } else {
            console.warn(
                "Notification Pusher ignorée : configuration absente ou externalId indisponible."
            );
        }

        // Confirmer l'enregistrement du message
        return response.status(201).json({
            message: "Message enregistré",
            data: message,
        });
    } catch (error) {
        console.error("Erreur API message :", error);

        return response.status(500).json({
            code: "INTERNAL_ERROR",
            message: "Impossible d'enregistrer le message",
        });
    }
}
