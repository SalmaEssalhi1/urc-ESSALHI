
import { getConnecterUser } from "../lib/session.js";
import PushNotifications from "@pusher/push-notifications-server";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({
            code: "METHOD_NOT_ALLOWED",
            message: "Méthode non autorisée",
        });
    }

    try {
        const user = await getConnecterUser(req);
        const requestedUserId = req.query?.user_id;

        if (!user || requestedUserId !== user.externalId) {
            return res.status(401).json({
                code: "UNAUTHORIZED",
                message: "Session expirée ou identifiant invalide",
            });
        }

        const instanceId = process.env.PUSHER_INSTANCE_ID;
        const secretKey = process.env.PUSHER_SECRET_KEY;

        if (!instanceId || !secretKey) {
            console.error("Configuration Pusher Beams manquante");
            return res.status(500).json({
                code: "PUSHER_NOT_CONFIGURED",
                message: "Le service de notifications n'est pas configuré",
            });
        }

        const beamsClient = new PushNotifications({
            instanceId,
            secretKey,
        });

        const beamsToken = beamsClient.generateToken(user.externalId);
        return res.status(200).json(beamsToken);
    } catch (error) {
        console.error("Erreur API Beams :", error);
        return res.status(500).json({
            code: "INTERNAL_ERROR",
            message: "Impossible de générer le jeton de notification",
        });
    }
}
