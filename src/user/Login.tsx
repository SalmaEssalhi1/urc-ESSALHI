import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { loginUser } from "./loginApi";
import type { Session } from "../model/common";
import { CustomError } from "../model/CustomError";

export function Login() {
    const [error, setError] = useState({} as CustomError);
    const [session, setSession] = useState({} as Session);
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

        setLoading(true);
        setError(new CustomError(""));

        loginUser(
            {
                user_id: -1,
                username: (data.get("login") as string).trim(),
                password: data.get("password") as string,
            },
            (result: Session) => {
                setSession(result);
                setLoading(false);

                if (result.token) {
                    sessionStorage.setItem("token", result.token);
                    sessionStorage.setItem("username", result.username ?? "");
                    sessionStorage.setItem("userId", String(result.id ?? ""));
                    sessionStorage.setItem("externalId", result.externalId);

                    form.reset();
                    console.log("Connexion réussie : navigation vers /", !!sessionStorage.getItem("token"));
                    navigate("/", { replace: true });
                } else {
                    setError(new CustomError("La connexion a échoué."));
                }
            },
            (loginError: CustomError) => {
                setError(loginError);
                setSession({} as Session);
                setLoading(false);
            }
        );
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
            <div className="w-100" style={{ maxWidth: "440px" }}>
                {/* Logo et nom de l'application */}
                <div className="text-center mb-4">
                    <img
                        src="/images/salma-badge.png"
                        alt="Logo Salma's UBO Chat"
                        className="mb-3"
                        style={{
                            width: "120px",
                            height: "120px",
                            objectFit: "contain",
                            filter:
                                "drop-shadow(0 8px 20px rgba(139, 92, 246, 0.3))",
                        }}
                    />

                    <h1
                        className="fw-bold mb-2"
                        style={{
                            fontSize: "clamp(1.7rem, 5vw, 2.2rem)",
                            letterSpacing: "-0.8px",
                        }}
                    >
                        Salma's <span style={{ color: "#a78bfa" }}>UBO Chat</span>
                    </h1>

                    <p style={{ color: "#a1a1b5", fontSize: "0.95rem" }}>
                        Connectez-vous et retrouvez votre communauté UBO.
                    </p>
                </div>

                {/* Carte de connexion */}
                <div
                    className="rounded-4"
                    style={{
                        background: "rgba(20, 20, 32, 0.94)",
                        border: "1px solid rgba(167, 139, 250, 0.18)",
                        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.35)",
                        padding: "clamp(24px, 6vw, 36px)",
                    }}
                >
                    <h2 className="h4 fw-bold mb-2">Bienvenue ! 👋</h2>

                    <p
                        className="mb-4"
                        style={{ color: "#a1a1b5", fontSize: "0.9rem" }}
                    >
                        Connectez-vous pour continuer la discussion.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label
                                htmlFor="login"
                                className="form-label fw-semibold"
                                style={{ color: "#e5e1f5" }}
                            >
                                Identifiant
                            </label>

                            <input
                                id="login"
                                name="login"
                                type="text"
                                className="form-control"
                                placeholder="Votre identifiant"
                                autoComplete="username"
                                required
                                disabled={loading}
                                style={{
                                    background: "#10101a",
                                    border: "1px solid #343044",
                                    color: "#f1f0fa",
                                    borderRadius: "12px",
                                    padding: "12px 14px",
                                }}
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
                                placeholder="Votre mot de passe"
                                autoComplete="current-password"
                                required
                                disabled={loading}
                                style={{
                                    background: "#10101a",
                                    border: "1px solid #343044",
                                    color: "#f1f0fa",
                                    borderRadius: "12px",
                                    padding: "12px 14px",
                                }}
                            />
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
                            {loading ? "Connexion en cours..." : "Se connecter →"}
                        </button>
                    </form>

                    {error.message && (
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
                            {error.message}
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
                            Vous n'avez pas de compte ?{" "}
                            <Link
                                to="/register"
                                className="fw-semibold text-decoration-none"
                                style={{ color: "#a78bfa" }}
                            >
                                Créer un compte
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