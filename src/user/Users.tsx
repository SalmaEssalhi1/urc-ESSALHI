
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers, type PublicUser } from "./usersApi";
import { uploadProfilePhoto } from "./profileApi";
import { CustomError } from "../model/CustomError";
import { useMessagingStore } from "../store/messagingStore";
import { initializeBeams } from "./beams";
import { getMyProfile } from "./meApi";

export function Users() {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [myAvatar, setMyAvatar] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const users = useMessagingStore((state) => state.users);
    const setUsers = useMessagingStore((state) => state.setUsers);
    const selectUser = useMessagingStore((state) => state.selectUser);

    useEffect(() => {
        initializeBeams().catch((err) => {
            console.error("Impossible d'initialiser les notifications :", err);
        });
    }, []);

    useEffect( () => {
        getUsers(
            (result: PublicUser[]) => {
                setUsers(result);
                setLoading(false);
            },
            (apiError: CustomError) => {
                setError(apiError.message);
                setLoading(false);

                if (apiError.httpStatus === 401) {
                    sessionStorage.clear();
                    navigate("/login", { replace: true });
                }
            }
        );
    }, [navigate, setUsers]);
    useEffect(() => {
    getMyProfile()
        .then((profile) => {
            setMyAvatar(profile.avatar_url || "");
        })
        .catch((err: unknown) => {
            console.error("Impossible de récupérer le profil :", err);
        });
}, []);

    async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        setError("");
        setUploading(true);

        try {
            const avatarUrl = await uploadProfilePhoto(file);
            setMyAvatar(avatarUrl);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Impossible de modifier la photo de profil."
            );
        } finally {
            setUploading(false);
            event.target.value = "";
        }
    }

    return (
        <div className="container py-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 mb-0">Utilisateurs</h1>

                <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                        sessionStorage.clear();
                        navigate("/login", { replace: true });
                    }}
                >
                    Déconnexion
                </button>
            </div>

            <section className="card mb-4">
                <div className="card-body d-flex align-items-center gap-3 flex-wrap">
                    <img
                        src={myAvatar || "/default-avatar.png"}
                        alt="Ma photo de profil"
                        className="rounded-circle border"
                        width="80"
                        height="80"
                        style={{ objectFit: "cover" }}
                        onError={(event) => {
                            event.currentTarget.src =
                                "https://placehold.co/80x80?text=Profil";
                        }}
                    />

                    <div>
                        <h2 className="h5">Ma photo de profil</h2>
                        <p className="text-secondary mb-2">
                            JPEG, PNG ou WebP — 5 Mo maximum.
                        </p>

                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? "Envoi en cours..." : "Modifier ma photo"}
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="d-none"
                            onChange={handlePhotoChange}
                            disabled={uploading}
                        />
                    </div>
                </div>
            </section>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {loading && (
                <p className="text-secondary">Chargement des utilisateurs...</p>
            )}

            {!loading && !error && users.length === 0 && (
                <p className="text-secondary">Aucun utilisateur disponible.</p>
            )}

            {!loading && users.length > 0 && (
                <div className="list-group shadow-sm">
                    {users.map((user) => (
                        <button
                            key={user.user_id}
                            type="button"
                            className="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3 text-start"
                            onClick={() => {
                                selectUser(user);
                                navigate(`/messages/user/${user.user_id}`);
                            }}
                        >
                            <div className="d-flex align-items-center gap-3">
                                <img
                                    src={
                                        user.avatar_url ||
                                        "https://placehold.co/48x48?text=Profil"
                                    }
                                    alt={`Photo de ${user.username}`}
                                    className="rounded-circle border"
                                    width="48"
                                    height="48"
                                    style={{ objectFit: "cover" }}
                                />

                                <div>
                                    <div className="fw-semibold">
                                        {user.username}
                                    </div>
                                    <small className="text-secondary">
                                        Dernière connexion :{" "}
                                        {user.last_login || "Jamais"}
                                    </small>
                                </div>
                            </div>

                            <span className="text-primary" aria-hidden="true">
                                →
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
