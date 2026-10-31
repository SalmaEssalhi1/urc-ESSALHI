
import { Client, TokenProvider } from "@pusher/push-notifications-web";

const INSTANCE_ID = "86f8282c-0aba-4e0b-bfd4-d5c1ac73bba5";

let beamsClient: Client | null = null;
let initializedUserId: string | null = null;
let initializationPromise: Promise<void> | null = null;

export function initializeBeams(): Promise<void> {
    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = initializeBeamsInternal().finally(() => {
        initializationPromise = null;
    });

    return initializationPromise;
}

async function initializeBeamsInternal(): Promise<void> {
    const token = sessionStorage.getItem("token");
    const externalId = sessionStorage.getItem("externalId");

    if (!token || !externalId) {
        console.info("Pusher Beams : utilisateur non connecté.");
        return;
    }

    if (
        !("Notification" in window) ||
        !("serviceWorker" in navigator)
    ) {
        console.warn(
            "Ce navigateur ne prend pas en charge les notifications push."
        );
        return;
    }

    if (Notification.permission === "denied") {
        console.warn(
            "Les notifications sont bloquées dans les paramètres du navigateur."
        );
        return;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
        console.info("Autorisation des notifications non accordée.");
        return;
    }

    if (initializedUserId === externalId && beamsClient) {
        console.info("Pusher Beams : utilisateur déjà initialisé.");
        return;
    }

    const registration =
        await navigator.serviceWorker.register("/service-worker.js");

    console.log("Nouvelle instance du client Pusher");

    const client = new Client({
        instanceId: INSTANCE_ID,
        serviceWorkerRegistration: registration,
    });

    beamsClient = client;

    await client.start();

    const tokenProvider = new TokenProvider({
        url: "/api/beams",
        queryParams: {
            user_id: externalId,
        },
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    console.log("Pusher identité demandée :", externalId);

    try {
        await client.setUserId(externalId, tokenProvider);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : String(error);

        if (
            !message.includes("Changing the `userId` is not allowed")
        ) {
            throw error;
        }

        console.warn(
            "Changement de compte détecté : réinitialisation de Beams."
        );

        await client.clearAllState();

        await client.start();

        await client.setUserId(externalId, tokenProvider);
    }

    initializedUserId = externalId;

    const deviceId = await client.getDeviceId();

    console.log("Pusher Beams connecté. Device ID :", deviceId);
}
