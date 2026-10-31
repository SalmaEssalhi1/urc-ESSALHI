
import { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { getRooms, type Room } from "./roomsApi";
import { getUsers, type PublicUser } from "./usersApi";
import { getMyProfile } from "./meApi";
import { initializeBeams } from "./beams";
import { CustomError } from "../model/CustomError";

export function ChatLayout() {
    console.log("ChatLayout monté");
    console.log("ChatLayout monté, token présent :", !!sessionStorage.getItem("token"));
    const navigate = useNavigate();
    const location = useLocation();

    const [rooms, setRooms] = useState<Room[]>([]);
    const [users, setUsers] = useState<PublicUser[]>([]);
    const [username, setUsername] = useState(
        sessionStorage.getItem("username") || "Mon profil"
    );
    const [avatar, setAvatar] = useState("");
    const [search, setSearch] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        initializeBeams().catch((err) => {
            console.warn("Notifications Pusher Beams non initialisées :", err);
        });

        let isMounted = true;

        getRooms()
            .then((loadedRooms) => {
                if (isMounted) setRooms(loadedRooms);
            })
            .catch((err: unknown) => {
                console.error("Erreur salons :", err);
                if (err instanceof CustomError && err.httpStatus === 401) {
                    sessionStorage.clear();
                    navigate("/login", { replace: true });
                    return;
                }
                if (isMounted) {
                    setError((prev) =>
                        prev
                            ? `${prev} Impossible de charger les salons.`
                            : "Impossible de charger les salons."
                    );
                }
            });

        getUsersList()
            .then((loadedUsers) => {
                if (isMounted) setUsers(loadedUsers);
            })
            .catch((err: unknown) => {
                console.error("Erreur utilisateurs :", err);
                if (err instanceof CustomError && err.httpStatus === 401) {
                    sessionStorage.clear();
                    navigate("/login", { replace: true });
                    return;
                }
                if (isMounted) {
                    setError((prev) =>
                        prev
                            ? `${prev} Impossible de charger les utilisateurs.`
                            : "Impossible de charger les utilisateurs."
                    );
                }
            });

        getMyProfile()
            .then((profile) => {
                if (!isMounted) return;
                if (profile.username) setUsername(profile.username);
                setAvatar(profile.avatar_url || "");
            })
            .catch((err) => console.error("Erreur profil :", err));

        return () => {
            isMounted = false;
        };
    }, [navigate]);

    async function getUsersList(): Promise<PublicUser[]> {
        return new Promise((resolve, reject) => {
            getUsers(resolve, reject);
        });
    }

    function logout() {
        sessionStorage.clear();
        navigate("/login", { replace: true });
    }

    const filteredUsers = users.filter((user) =>
        user.username.toLowerCase().includes(search.toLowerCase())
    );

    const selectedRoom = location.pathname.match(/^\/rooms\/(\d+)/);
    const selectedUser = location.pathname.match(/^\/messages\/user\/(\d+)/);

    return (
        <div className="chat-app">
            <aside className="chat-sidebar">
                <div className="chat-brand">
                    <img
                        className="chat-brand-logo"
                        src="/images/salma-badge.png"
                        alt="Logo UBO Relay"
                    />
                    <div>
                        <h1>UBO Relay</h1>
                        <span>Messagerie collaborative</span>
                    </div>
                </div>

                <div className="chat-search">
                    <span>⌕</span>
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Rechercher..."
                        aria-label="Rechercher un utilisateur"
                    />
                </div>

                <section className="chat-nav-section">
                    <div className="chat-section-heading">
                        <span>ROOMS</span>
                    </div>

                    {rooms.map((room) => (
                        <button
                            key={room.room_id}
                            className={`chat-nav-item ${
                                selectedRoom?.[1] === String(room.room_id)
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() => navigate(`/rooms/${room.room_id}`)}
                        >
                            <span className="chat-hash">#</span>
                            <span>{room.name}</span>
                        </button>
                    ))}
                </section>

                <section className="chat-nav-section chat-people">
                    <div className="chat-section-heading">
                        <span>UTILISATEURS</span>
                        <span className="chat-count">{filteredUsers.length}</span>
                    </div>

                    {filteredUsers.map((user) => (
                        <button
                            key={user.user_id}
                            className={`chat-user-item ${
                                selectedUser?.[1] === String(user.user_id)
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() =>
                                navigate(`/messages/user/${user.user_id}`)
                            }
                        >
                            <img
                                src={user.avatar_url || "/default-avatar.png"}
                                alt=""
                                onError={(event) => {
                                    event.currentTarget.src =
                                        "https://placehold.co/40x40?text=?";
                                }}
                            />
                            <span className="chat-user-name">{user.username}</span>
                            <span className="chat-status" />
                        </button>
                    ))}
                </section>

                {error && <p className="chat-error">{error}</p>}

                <div className="chat-sidebar-footer">
                    <button
                        type="button"
                        className="chat-profile-button"
                        onClick={() => navigate("/profile")}
                        title="Modifier mon profil"
                    >
                        <img
                            src={avatar || "/default-avatar.png"}
                            alt=""
                            onError={(event) => {
                                event.currentTarget.src =
                                    "https://placehold.co/40x40?text=?";
                            }}
                        />
                        <div className="chat-profile-info">
                            <strong>{username}</strong>
                            <span>Mon profil</span>
                        </div>
                    </button>

                    <button
                        type="button"
                        className="chat-logout"
                        onClick={logout}
                        title="Déconnexion"
                        aria-label="Déconnexion"
                    >
                        ↗
                    </button>
                </div>
            </aside>

            <main className="chat-main">
                <Outlet />
            </main>
        </div>
    );
}
