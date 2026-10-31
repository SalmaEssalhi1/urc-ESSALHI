
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRooms, type Room } from "./roomsApi";
import { CustomError } from "../model/CustomError";

export function Rooms() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        getRooms()
            .then((result) => {
                if (active) setRooms(result);
            })
            .catch((err: unknown) => {
                if (!active) return;

                if (err instanceof CustomError) {
                    setError(err.message);
                    if (err.httpStatus === 401) {
                        navigate("/login");
                    }
                } else {
                    setError("Impossible de charger les salons.");
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [navigate]);

    function logout() {
        sessionStorage.removeItem("token");
        navigate("/login");
    }

    return (
        <main className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>Salons de discussion</h1>
                <div>
                    <button
                        className="btn btn-outline-primary me-2"
                        onClick={() => navigate("/users")}
                    >
                        Messages privés
                    </button>
                    <button
                        className="btn btn-outline-danger"
                        onClick={logout}
                    >
                        Déconnexion
                    </button>
                </div>
            </div>

            {loading && <p>Chargement des salons...</p>}

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {!loading && !error && rooms.length === 0 && (
                <p>Aucun salon disponible.</p>
            )}

            <div className="list-group">
                {rooms.map((room) => (
                    <button
                        key={room.room_id}
                        type="button"
                        className="list-group-item list-group-item-action"
                        onClick={() => navigate(`/rooms/${room.room_id}`)}
                    >
                        <strong>{room.name}</strong>
                        <br />
                        <small className="text-muted">
                            Créé le {room.created_on}
                        </small>
                    </button>
                ))}
            </div>
        </main>
    );
}
