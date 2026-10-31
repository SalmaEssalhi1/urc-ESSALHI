
import { AUTHENT_HEADER, BEARER } from "../model/common";
import { CustomError } from "../model/CustomError";

export interface PublicUser {
    user_id: number;
    username: string;
    last_login: string | null;
    avatar_url: string | null;
}
export function getUsers(
    onResult: (users: PublicUser[]) => void,
    onError: (error: CustomError) => void
) {
    const token = sessionStorage.getItem("token");

    if (!token) {
        const error = new CustomError("Vous devez vous connecter.");
        error.code = "UNAUTHORIZED";
        error.httpStatus = 401;
        onError(error);
        return;
    }

    fetch("/api/users", {
        method: "GET",
        headers: {
            [AUTHENT_HEADER]: BEARER + token,
        },
    })
        .then(async (response) => {
            if (!response.ok) {
                const data = await response.json().catch(() => null);
                const error = new CustomError(
                    data?.message || "Impossible de récupérer les utilisateurs."
                );
                error.code = data?.code;
                error.httpStatus = response.status;
                throw error;
            }

            return response.json() as Promise<PublicUser[]>;
        })
        .then(onResult)
        .catch((error: unknown) => {
            if (error instanceof CustomError) {
                onError(error);
            } else {
                onError(new CustomError("Erreur de communication avec le serveur."));
            }
        });
}
