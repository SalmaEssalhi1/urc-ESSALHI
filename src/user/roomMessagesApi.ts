
import { AUTHENT_HEADER, BEARER } from "../model/common";
import { CustomError } from "../model/CustomError";

export type RoomMessage = {
    id: string;
    roomId: number;
    senderId: number;
    senderUsername: string;
    content: string;
    createdAt: string;
    reactions?: RoomReactions;
};

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

export function getRoomMessages(roomId: number): Promise<RoomMessage[]> {
    return requestMessages<RoomMessage[]>(
        `/api/room-messages?roomId=${encodeURIComponent(roomId)}`,
        {
            method: "GET",
            headers: {
                [AUTHENT_HEADER]: BEARER + getToken(),
            },
        }
    );
}

export function sendRoomMessage(
    roomId: number,
    content: string
): Promise<RoomMessage> {
    return requestMessages<{ message: string; data: RoomMessage }>(
        "/api/room-message",
        {
            method: "POST",
            headers: {
                [AUTHENT_HEADER]: BEARER + getToken(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ roomId, content }),
        }
    ).then((result) => result.data);
}

export type RoomReactions = Record<string, (string | number)[]>;

export async function toggleRoomReaction(
    roomId: number,
    messageId: string,
    emoji: string
): Promise<RoomReactions> {
    const token = sessionStorage.getItem("token");

    if (!token) {
        throw new CustomError("Vous devez vous connecter.");
    }

    const response = await fetch("/api/room-reaction", {
        method: "POST",
        headers: {
            [AUTHENT_HEADER]: BEARER + token,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ roomId, messageId, emoji }),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new CustomError(
            result.message ?? "Impossible de modifier la réaction."
        );
    }

    return result.reactions as RoomReactions;
}

