
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

                <Route
    path="/"
    element={
        sessionStorage.getItem("token")
            ? <ChatLayout />
            : <Navigate to="/login" replace />
    }
>
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
