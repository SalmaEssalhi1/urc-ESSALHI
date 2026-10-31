
import { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './user/Login';
import { Register } from './user/Register';
import { Conversation } from './user/Conversation';
import { RoomConversation } from './user/RoomConversation';
import { ChatLayout } from './user/ChatLayout';
import { Profile } from './user/Profile';

function ChatHome() {
    return (
        <div className="chat-welcome">
            <img
                className="chat-welcome-logo"
                src="/images/salma-badge.png"
                alt="Logo UBO Relay Chat"
            />
            <h1>Bienvenue sur Salma's UBO Relay Chat</h1>
            <p>
                Sélectionnez une room ou un utilisateur dans la barre latérale
                pour commencer une conversation.
            </p>
        </div>
    );
}

function ProtectedRoute() {
    const token = sessionStorage.getItem("token");
    const [status, setStatus] = useState(token ? "checking" : "unauthenticated");

    useEffect(() => {
        const currentToken = sessionStorage.getItem("token");
        if (!currentToken) {
            setStatus("unauthenticated");
            return;
        }

        // Vérification de la session réelle auprès du backend
        fetch("/api/me", {
            headers: {
                Authorization: `Bearer ${currentToken}`,
            },
        })
            .then((response) => {
                if (response.ok) {
                    setStatus("authenticated");
                } else {
                    sessionStorage.clear();
                    setStatus("unauthenticated");
                }
            })
            .catch(() => {
                sessionStorage.clear();
                setStatus("unauthenticated");
            });
    }, []);

    if (status === "checking") {
        return (
            <div
                className="min-vh-100 d-flex align-items-center justify-content-center"
                style={{
                    background:
                        "radial-gradient(ellipse at top left, #292044 0%, #11111b 45%, #09090f 100%)",
                    color: "#a78bfa",
                }}
            >
                <div className="text-center">
                    <div
                        className="spinner-border mb-3"
                        role="status"
                        style={{ width: "2.5rem", height: "2.5rem" }}
                    >
                        <span className="visually-hidden">Chargement...</span>
                    </div>
                    <p style={{ color: "#a1a1b5", fontSize: "0.95rem" }}>
                        Vérification de la session...
                    </p>
                </div>
            </div>
        );
    }

    if (status === "unauthenticated") {
        return <Navigate to="/login" replace />;
    }

    return <ChatLayout />;
}

function App() {
    console.log(
        "ROUTAGE",
        window.location.pathname,
        !!sessionStorage.getItem("token")
    );
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route path="/" element={<ProtectedRoute />}>
                    <Route index element={<ChatHome />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="users" element={<Navigate to="/" replace />} />
                    <Route path="rooms" element={<Navigate to="/" replace />} />
                    <Route path="rooms/:roomId" element={<RoomConversation />} />
                    <Route
                        path="messages/user/:userId"
                        element={<Conversation />}
                    />
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
