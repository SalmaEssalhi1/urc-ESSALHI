import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { registerUser } from "./registerApi";
import { CustomError } from "../model/CustomError";

export function Register() {
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    if (sessionStorage.getItem("token")) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (loading) return;

        const form = event.currentTarget;
        const data = new FormData(form);

        setError("");
        setSuccess("");
        setLoading(true);

        registerUser(
            {
                username: (data.get("username") as string).trim(),
                email: (data.get("email") as string).trim(),
                password: data.get("password") as string,
            },
            (message) => {
                setSuccess(message);
                setLoading(false);
                form.reset();
            },
            (apiError: CustomError) => {
                setError(apiError.message);
                setLoading(false);
            }
        );
    };

    const inputStyle: React.CSSProperties = {
        background: "#10101a",
        border: "1px solid #343044",
        color: "#f1f0fa",
        borderRadius: "12px",
        padding: "12px 14px",
    };

    return (
        <main
            className="min-vh-100 d-flex align-items-center justify-content-center p-3"
            style={{
                background:
                    "radial-gradient(ellipse at top left, #292044 0%, #11111b 45%, #09090f 100%)",
                color: "#f1f0fa",
            }}
        >
            <div className="w-100" style={{ maxWidth: "460px" }}>
                <div className="text-center mb-4">
                    <img
    src="/images/salma-badge.png"
    alt="Logo Salma's UBO Chat"
    className="mb-3"
    style={{
        width: "120px",
        height: "120px",
        objectFit: "contain",
        filter: "drop-shadow(0 8px 20px rgba(139, 92, 246, 0.3))",
    }}
/>

                    <h1
                        className="fw-bold mb-2"
                        style={{
                            fontSize: "clamp(1.7rem, 5vw, 2.2rem)",
                            letterSpacing: "-0.8px",
                        }}
                    >
                        Salma's{" "}
                        <span style={{ color: "#a78bfa" }}>UBO Chat</span>
                    </h1>

                    <p style={{ color: "#a1a1b5", fontSize: "0.95rem" }}>
                        Rejoignez votre communauté UBO.
                    </p>
                </div>

                <div
                    className="rounded-4"
                    style={{
                        background: "rgba(20, 20, 32, 0.94)",
                        border: "1px solid rgba(167, 139, 250, 0.18)",
                        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.35)",
                        padding: "clamp(24px, 6vw, 36px)",
                    }}
                >
                    <h2 className="h4 fw-bold mb-2">
                        Créez votre compte ✨
                    </h2>

                    <p
                        className="mb-4"
                        style={{ color: "#a1a1b5", fontSize: "0.9rem" }}
                    >
                        Quelques informations pour commencer à discuter.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label
                                htmlFor="username"
                                className="form-label fw-semibold"
                                style={{ color: "#e5e1f5" }}
                            >
                                Identifiant
                            </label>

                            <input
                                id="username"
                                name="username"
                                type="text"
                                className="form-control"
                                placeholder="Choisissez un identifiant"
                                autoComplete="username"
                                maxLength={50}
                                required
                                disabled={loading}
                                style={inputStyle}
                            />
                        </div>

                        <div className="mb-3">
                            <label
                                htmlFor="email"
                                className="form-label fw-semibold"
                                style={{ color: "#e5e1f5" }}
                            >
                                Adresse e-mail
                            </label>

                            <input
                                id="email"
                                name="email"
                                type="email"
                                className="form-control"
                                placeholder="exemple@univ-brest.fr"
                                autoComplete="email"
                                maxLength={255}
                                required
                                disabled={loading}
                                style={inputStyle}
                            />
                        </div>

                        <div className="mb-4">
                            <label
                                htmlFor="password"
                                className="form-label fw-semibold"
                                style={{ color: "#e5e1f5" }}
                            >
                                Mot de passe
                            </label>

                            <input
                                id="password"
                                name="password"
                                type="password"
                                className="form-control"
                                placeholder="Choisissez un mot de passe"
                                autoComplete="new-password"
                                maxLength={72}
                                required
                                disabled={loading}
                                style={inputStyle}
                            />

                            <small
                                className="d-block mt-2"
                                style={{ color: "#85839a" }}
                            >
                                Choisissez un mot de passe sécurisé.
                            </small>
                        </div>

                        <button
                            type="submit"
                            className="btn w-100 fw-bold text-white"
                            disabled={loading}
                            style={{
                                background:
                                    "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                                border: "none",
                                borderRadius: "12px",
                                padding: "13px",
                                boxShadow:
                                    "0 5px 20px rgba(139, 92, 246, 0.22)",
                            }}
                        >
                            {loading
                                ? "Inscription en cours..."
                                : "Créer mon compte →"}
                        </button>
                    </form>

                    {error && (
                        <div
                            className="mt-4 mb-0 rounded-3 p-3"
                            role="alert"
                            style={{
                                background: "rgba(220, 53, 69, 0.12)",
                                border: "1px solid rgba(220, 53, 69, 0.3)",
                                color: "#ff9ca6",
                                fontSize: "0.9rem",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {success && (
                        <div
                            className="mt-4 mb-0 rounded-3 p-3"
                            role="status"
                            style={{
                                background: "rgba(34, 197, 94, 0.10)",
                                border: "1px solid rgba(34, 197, 94, 0.3)",
                                color: "#86efac",
                                fontSize: "0.9rem",
                            }}
                        >
                            {success}

                            <div className="mt-3">
                                <button
                                    type="button"
                                    className="btn btn-sm text-white"
                                    onClick={() => navigate("/login")}
                                    style={{
                                        background:
                                            "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                                        border: "none",
                                        borderRadius: "9px",
                                    }}
                                >
                                    Aller à la connexion →
                                </button>
                            </div>
                        </div>
                    )}

                    <div
                        className="text-center mt-4 pt-4"
                        style={{ borderTop: "1px solid #302b40" }}
                    >
                        <p
                            className="mb-0"
                            style={{ color: "#a1a1b5", fontSize: "0.9rem" }}
                        >
                            Déjà un compte ?{" "}
                            <Link
                                to="/login"
                                className="fw-semibold text-decoration-none"
                                style={{ color: "#a78bfa" }}
                            >
                                Se connecter
                            </Link>
                        </p>
                    </div>
                </div>

                <p
                    className="text-center mt-4 mb-0"
                    style={{ color: "#77758c", fontSize: "0.8rem" }}
                >
                    © {new Date().getFullYear()} Salma's UBO Chat
                </p>
            </div>
        </main>
    );
}