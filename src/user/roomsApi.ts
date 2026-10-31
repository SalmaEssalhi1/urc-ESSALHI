
import { AUTHENT_HEADER, BEARER } from "../model/common";
import { CustomError } from "../model/CustomError";

export type Room = {
    room_id: number;
    name: string;
    created_on: string;
};

export async function getRooms(): Promise<Room[]> {
    const token = sessionStorage.getItem("token");

    if (!token) {
        throw new CustomError("Vous devez vous connecter.");
    }

    const response = await fetch("/api/rooms", {
        method: "GET",
        headers: {
            [AUTHENT_HEADER]: BEARER + token,
        },
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
        const error = new CustomError(
            result?.message || "Impossible de récupérer les salons."
        );
        error.code = result?.code;
        error.httpStatus = response.status;
        throw error;
    }

    return result as Room[];
}
