
import type { UploadedImage } from "./uploadApi";

export async function uploadProfilePhoto(file: File): Promise<string> {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
        throw new Error("Formats acceptés : JPEG, PNG et WebP.");
    }

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
        throw new Error("La photo doit peser au maximum 5 Mo.");
    }

    const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
            } else {
                reject(new Error("Impossible de lire la photo."));
            }
        };

        reader.onerror = () => reject(new Error("Erreur de lecture du fichier."));
        reader.readAsDataURL(file);
    });

    const token = sessionStorage.getItem("token");

    if (!token) {
        throw new Error("Vous devez être connecté.");
    }

    const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            data,
        }),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.message || "Impossible de mettre à jour la photo."
        );
    }

    return result.data.avatar_url as string;
}
