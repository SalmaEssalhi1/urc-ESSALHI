
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getMyProfile } from "./meApi";
import { uploadProfilePhoto } from "./profileApi";
import { updateProfile } from "./updateProfileApi";

export function Profile() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [avatar, setAvatar] = useState("");
    const [editUsername, setEditUsername] = useState(false);
    const [editEmail, setEditEmail] = useState(false);
    const [usernameDraft, setUsernameDraft] = useState("");
    const [emailDraft, setEmailDraft] = useState("");
    const [usernamePassword, setUsernamePassword] = useState("");
    const [emailPassword, setEmailPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [photo, setPhoto] = useState<File | null>(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getMyProfile()
            .then((profile) => {
                setUsername(profile.username);
                setEmail(profile.email);
                setUsernameDraft(profile.username);
                setEmailDraft(profile.email);
                setAvatar(profile.avatar_url || "");
            })
            .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Impossible de charger le profil.");
            });

        if (!sessionStorage.getItem("token")) navigate("/login");
    }, [navigate]);

    async function saveIdentity(
        event: FormEvent<HTMLFormElement>,
        field: "username" | "email"
    ) {
        event.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);

        try {
            const data = await updateProfile({
                username: field === "username" ? usernameDraft : username,
                email: field === "email" ? emailDraft : email,
                currentPassword: field === "username" ? usernamePassword : emailPassword,
            });

            setUsername(data.username);
            setEmail(data.email);
            setUsernameDraft(data.username);
            setEmailDraft(data.email);
            setUsernamePassword("");
            setEmailPassword("");
            setEditUsername(false);
            setEditEmail(false);
            setMessage(field === "username" ? "Nom d'utilisateur modifié avec succès." : "Adresse e-mail modifiée avec succès.");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Impossible de modifier le profil.");
        } finally {
            setLoading(false);
        }
    }

    async function savePassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setMessage("");

        if (!currentPassword || !newPassword) {
            setError("Entrez votre mot de passe actuel et votre nouveau mot de passe.");
            return;
        }

        setLoading(true);
        try {
            const data = await updateProfile({
                username,
                email,
                currentPassword,
                newPassword,
            });

            setUsername(data.username);
            setEmail(data.email);
            setCurrentPassword("");
            setNewPassword("");
            setMessage("Mot de passe modifié avec succès.");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Impossible de modifier le mot de passe.");
        } finally {
            setLoading(false);
        }
    }

    async function savePhoto() {
        if (!photo) return;
        setError("");
        setMessage("");
        setLoading(true);

        try {
            const avatarUrl = await uploadProfilePhoto(photo);
            setAvatar(avatarUrl);
            setPhoto(null);
            setMessage("Photo de profil modifiée avec succès.");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Impossible de modifier la photo.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="profile-page">
            <h1>Mon profil</h1>
            <p>Gérez les informations de votre compte.</p>

            {error && <p role="alert" className="profile-error">{error}</p>}
            {message && <p role="status" className="profile-success">{message}</p>}

            <section className="profile-section">
                <h2>Photo de profil</h2>
                <div className="profile-avatar">
                    <img
                        src={avatar || "/default-avatar.png"}
                        alt="Photo de profil"
                        onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = "https://placehold.co/100x100?text=?";
                        }}
                    />
                    <label>
                        Choisir une photo
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) => setPhoto(event.target.files?.[0] || null)}
                        />
                    </label>
                    <button type="button" onClick={savePhoto} disabled={loading || !photo}>
                        Enregistrer la photo
                    </button>
                </div>
            </section>

            <hr />

            <section className="profile-section">
                <h2>Nom d'utilisateur</h2>
                {!editUsername ? (
                    <div className="profile-value-row">
                        <span>{username}</span>
                        <button
                            type="button"
                            className="profile-edit-button"
                            aria-label="Modifier le nom d'utilisateur"
                            title="Modifier"
                            onClick={() => {
                                setUsernameDraft(username);
                                setEditUsername(true);
                                setEditEmail(false);
                                setError("");
                                setMessage("");
                            }}
                        >
                            ✎
                        </button>
                    </div>
                ) : (
                    <form className="profile-form" onSubmit={(event) => saveIdentity(event, "username")}>
                        <label>
                            Nouveau nom d'utilisateur
                            <input
                                value={usernameDraft}
                                onChange={(event) => setUsernameDraft(event.target.value)}
                                maxLength={50}
                                required
                            />
                        </label>
                        <label>
                            Mot de passe actuel (confirmation)
                            <input
                                type="password"
                                autoComplete="current-password"
                                value={usernamePassword}
                                onChange={(event) => setUsernamePassword(event.target.value)}
                                required
                            />
                        </label>
                        <div className="profile-actions">
                            <button type="submit" disabled={loading}>
                                {loading ? "Enregistrement..." : "Enregistrer"}
                            </button>
                            <button type="button" onClick={() => setEditUsername(false)}>Annuler</button>
                        </div>
                    </form>
                )}
            </section>

            <hr />

            <section className="profile-section">
                <h2>Adresse e-mail</h2>
                {!editEmail ? (
                    <div className="profile-value-row">
                        <span>{email}</span>
                        <button
                            type="button"
                            className="profile-edit-button"
                            aria-label="Modifier l'adresse e-mail"
                            title="Modifier"
                            onClick={() => {
                                setEmailDraft(email);
                                setEditEmail(true);
                                setEditUsername(false);
                                setError("");
                                setMessage("");
                            }}
                        >
                            ✎
                        </button>
                    </div>
                ) : (
                    <form className="profile-form" onSubmit={(event) => saveIdentity(event, "email")}>
                        <label>
                            Nouvelle adresse e-mail
                            <input
                                type="email"
                                value={emailDraft}
                                onChange={(event) => setEmailDraft(event.target.value)}
                                maxLength={255}
                                required
                            />
                        </label>
                        <label>
                            Mot de passe actuel (confirmation)
                            <input
                                type="password"
                                autoComplete="current-password"
                                value={emailPassword}
                                onChange={(event) => setEmailPassword(event.target.value)}
                                required
                            />
                        </label>
                        <div className="profile-actions">
                            <button type="submit" disabled={loading}>
                                {loading ? "Enregistrement..." : "Enregistrer"}
                            </button>
                            <button type="button" onClick={() => setEditEmail(false)}>Annuler</button>
                        </div>
                    </form>
                )}
            </section>

            <hr />

            <section className="profile-section">
                <h2>Changer le mot de passe</h2>
                <form className="profile-form" onSubmit={savePassword}>
                    <label>
                        Mot de passe actuel
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(event) => setCurrentPassword(event.target.value)}
                            required
                        />
                    </label>
                    <label>
                        Nouveau mot de passe
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                            minLength={8}
                            maxLength={72}
                            required
                        />
                    </label>
                    <div className="profile-actions">
                        <button type="submit" disabled={loading}>
                            {loading ? "Enregistrement..." : "Confirmer"}
                        </button>
                    </div>
                </form>
            </section>

            <button type="button" className="profile-back-button" onClick={() => navigate("/")}>
                Retour au chat
            </button>
        </div>
    );
}
