
export interface UpdateProfileData {
    username: string;
    email: string;
    currentPassword?: string;
    newPassword?: string;
}

export async function updateProfile(
    data: UpdateProfileData
) {
    const token = sessionStorage.getItem("token");

    if (!token) {
        throw new Error("Vous devez être connecté.");
    }

    const response = await fetch("/api/update-profile", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.message || "Impossible de modifier le profil."
        );
    }

    // Actualiser le nom conservé dans la session du navigateur.
    if (result.data?.username) {
        sessionStorage.setItem("username", result.data.username);
    }

    return result.data;
}
