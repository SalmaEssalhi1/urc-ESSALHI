export interface MyProfile {
    user_id: number;
    username: string;
    email: string;
    avatar_url: string | null;
}
export async function getMyProfile(): Promise<MyProfile> {
    const token = sessionStorage.getItem("token");

    if (!token) {
        throw new Error("Vous devez être connecté.");
    }

    const response = await fetch("/api/me", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.message || "Impossible de récupérer votre profil."
        );
    }

    return result as MyProfile;
}
