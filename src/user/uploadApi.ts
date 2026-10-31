export interface UploadedImage {
    url: string;
    contentType: string;
    filename: string;
    size: number;
}

export async function uploadImage(file: File): Promise<UploadedImage> {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
        throw new Error("Formats acceptés : JPEG, PNG, GIF et WebP.");
    }

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
        throw new Error("L'image doit peser au maximum 5 Mo.");
    }

    const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
            } else {
                reject(new Error("Impossible de lire l'image."));
            }
        };

        reader.onerror = () => reject(new Error("Erreur de lecture du fichier."));
        reader.readAsDataURL(file);
    });

    const token = sessionStorage.getItem("token");

    if (!token) {
        throw new Error("Vous devez être connecté.");
    }

    const response = await fetch("/api/upload", {
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
        throw new Error(result.message || "Échec de l'envoi de l'image.");
    }

    return result.data as UploadedImage;
}
