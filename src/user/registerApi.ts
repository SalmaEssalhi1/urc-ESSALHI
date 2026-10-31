
import { CustomError } from "../model/CustomError";

export interface RegistrationData {
    username: string;
    email: string;
    password: string;
}

export function registerUser(
    data: RegistrationData,
    onResult: (message: string) => void,
    onError: (error: CustomError) => void
) {
    fetch("/api/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    })
        .then(async (response) => {
            const result = await response.json();

            if (!response.ok) {
                const error = new CustomError(
                    result.message || "L'inscription a échoué."
                );
                error.code = result.code;
                error.httpStatus = response.status;
                throw error;
            }

            onResult(result.message || "Inscription réussie.");
        })
        .catch((error: unknown) => {
            if (error instanceof CustomError) {
                onError(error);
            } else {
                onError(
                    new CustomError(
                        "Erreur de communication avec le serveur."
                    )
                );
            }
        });
}
