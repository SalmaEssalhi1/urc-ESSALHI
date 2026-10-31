
import { AUTHENT_HEADER, BEARER } from "../model/common";
import { CustomError } from "../model/CustomError";
import type { Message } from "../store/messagingStore";

function getToken(): string {
    const token = sessionStorage.getItem("token");

    if (!token) {
        throw new CustomError("Vous devez vous connecter.");
    }

    return token;
}

async function requestMessages<T>(
    url: string,
    options: RequestInit
): Promise<T> {
    const response = await fetch(url, options);
    const result = await response.json().catch(() => null);

    if (!response.ok) {
        const error = new CustomError(
            result?.message || "Une erreur est survenue."
        );
        error.code = result?.code;
        error.httpStatus = response.status;
        throw error;
    }

    return result as T;
}

export function getMessages(targetId: number): Promise<Message[]> {
    return requestMessages<Message[]>(
        `/api/messages?targetId=${encodeURIComponent(targetId)}`,
        {
            method: "GET",
            headers: {
                [AUTHENT_HEADER]: BEARER + getToken(),
            },
        }
    );
}

export function sendMessage(
    targetId: number,
    content: string
): Promise<Message> {
    return requestMessages<{ message: string; data: Message }>(
        "/api/message",
        {
            method: "POST",
            headers: {
                [AUTHENT_HEADER]: BEARER + getToken(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ targetId, content }),
        }
    ).then((result) => result.data);
}

export function toggleMessageReaction(
    targetId: number,
    messageId: string,
    emoji: string
): Promise<Record<string, number[]>> {
    return requestMessages<{ message: string; reactions: Record<string, number[]> }>(
        "/api/message-reaction",
        {
            method: "POST",
            headers: {
                [AUTHENT_HEADER]: BEARER + getToken(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ targetId, messageId, emoji }),
        }
    ).then((result) => result.reactions);
}

