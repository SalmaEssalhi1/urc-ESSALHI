
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRooms, type Room } from "./roomsApi";
import {
    getRoomMessages,
    sendRoomMessage,
    toggleRoomReaction,
    type RoomMessage,
    type RoomReactions,
} from "./roomMessagesApi";
import { uploadImage } from "./uploadApi";
import { CustomError } from "../model/CustomError";

const EMOJIS = [
    "😀", "😂", "🥹", "😍", "🥰", "😘",
    "😊", "😎", "😭", "😡", "❤️", "💕",
    "👍", "👎", "👏", "🙏", "🔥", "🎉",
    "💯", "🤔", "😉", "😴", "🤗", "🙌",
];

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👏"];

export function RoomConversation() {
    const { roomId: rawRoomId } = useParams();
    const roomId = Number(rawRoomId);
    const navigate = useNavigate();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesRef = useRef<HTMLDivElement>(null);

    const [room, setRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<RoomMessage[]>([]);
    const [reactions, setReactions] = useState<
        Record<string, RoomReactions>
    >({});
    const [reactingTo, setReactingTo] = useState<string | null>(null);
    const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(
        null
    );

    const [content, setContent] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const username = sessionStorage.getItem("username") ?? "";

    const loadMessages = useCallback(async () => {
        try {
            const result = await getRoomMessages(roomId);

            setMessages(result);
            setReactions(
                Object.fromEntries(
                    result.map((message) => [
                        message.id,
                        message.reactions ?? {},
                    ])
                )
            );
            setError("");
        } catch (err: unknown) {
            if (err instanceof CustomError) {
                setError(err.message);

                if (err.httpStatus === 401) {
                    navigate("/login");
                }
            } else {
                setError("Impossible de charger les messages.");
            }
        } finally {
            setLoading(false);
        }
    }, [roomId, navigate]);

    async function handleReaction(messageId: string, emoji: string) {
        if (reactingTo !== null) return;

        setReactingTo(messageId);
        setReactionPickerFor(null);
        setError("");

        try {
            const updatedReactions = await toggleRoomReaction(
                roomId,
                messageId,
                emoji
            );

            setReactions((previous) => ({
                ...previous,
                [messageId]: updatedReactions,
            }));
        } catch (err: unknown) {
            if (err instanceof CustomError) {
                setError(err.message);

                if (err.httpStatus === 401) {
                    navigate("/login");
                }
            } else {
                setError("Impossible de modifier la réaction.");
            }
        } finally {
            setReactingTo(null);
        }
    }

    useEffect(() => {
        if (!Number.isInteger(roomId) || roomId <= 0) {
            navigate("/rooms", { replace: true });
            return;
        }

        let active = true;

        getRooms()
            .then((rooms) => {
                if (!active) return;

                const found = rooms.find(
                    (item) => item.room_id === roomId
                );

                if (!found) {
                    navigate("/rooms", { replace: true });
                    return;
                }

                setRoom(found);
            })
            .catch((err: unknown) => {
                if (!active) return;

                if (err instanceof CustomError) {
                    setError(err.message);

                    if (err.httpStatus === 401) {
                        navigate("/login");
                    }
                } else {
                    setError("Impossible de charger le salon.");
                }
            });

        return () => {
            active = false;
        };
    }, [roomId, navigate]);

    useEffect(() => {
        if (!Number.isInteger(roomId) || roomId <= 0) return;

        void loadMessages();

        const intervalId = window.setInterval(() => {
            void loadMessages();
        }, 5000);

        return () => window.clearInterval(intervalId);
    }, [roomId, loadMessages]);

    useEffect(() => {
        const container = messagesRef.current;

        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    function insertEmoji(emoji: string) {
        const input = inputRef.current;

        if (!input) return;

        const start = input.selectionStart ?? content.length;
        const end = input.selectionEnd ?? content.length;

        const newContent =
            content.slice(0, start) + emoji + content.slice(end);

        setContent(newContent);
        setShowEmojiPicker(false);

        requestAnimationFrame(() => {
            if (!inputRef.current) return;

            inputRef.current.focus();

            const cursorPosition = start + emoji.length;

            inputRef.current.setSelectionRange(
                cursorPosition,
                cursorPosition
            );
        });
    }

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (!file) return;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            setError("Formats autorisés : JPEG, PNG, GIF et WebP.");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError("L'image ne doit pas dépasser 5 Mo.");
            event.target.value = "";
            return;
        }

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setError("");
    }

    function removeSelectedFile() {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        setSelectedFile(null);
        setPreviewUrl("");

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    async function handleSend(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const trimmedContent = content.trim();

        if ((!trimmedContent && !selectedFile) || sending) return;

        setSending(true);
        setError("");

        try {
            let messageContent = trimmedContent;

            if (selectedFile) {
                const uploaded = await uploadImage(selectedFile);

                messageContent = trimmedContent
                    ? `${trimmedContent}\n${uploaded.url}`
                    : uploaded.url;
            }

            await sendRoomMessage(roomId, messageContent);

            setContent("");
            setShowEmojiPicker(false);
            removeSelectedFile();

            await loadMessages();
        } catch (err: unknown) {
            if (err instanceof CustomError) {
                setError(err.message);

                if (err.httpStatus === 401) {
                    navigate("/login");
                }
            } else {
                setError(
                    "Impossible d'envoyer le message ou l'image. Réessayez."
                );
            }
        } finally {
            setSending(false);
        }
    }

    function renderMessageContent(messageContent: string) {
        const urlRegex = /(https?:\/\/\S+)/g;
        const parts = messageContent.split(urlRegex);

        return parts.map((part, index) => {
            const isImage =
                /^https?:\/\/\S+$/.test(part) &&
                /\.(jpe?g|png|gif|webp)(?:[?#].*)?$/i.test(part);

            if (isImage) {
                return (
                    <img
                        key={`${part}-${index}`}
                        src={part}
                        alt="Image envoyée dans le salon"
                        className="chat-private-image"
                    />
                );
            }

            return <span key={`${index}-${part}`}>{part}</span>;
        });
    }

    return (
        <section className="chat-private-conversation">
            <header className="chat-private-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h1>{room?.name ?? "Salon de discussion"}</h1>
                    <small>Salon de discussion · Messages partagés</small>
                </div>

                <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate("/rooms")}
                >
                    Salons
                </button>
            </header>

            {error && (
                <div className="alert alert-danger m-2" role="alert">
                    {error}
                </div>
            )}

            <div
                ref={messagesRef}
                className="chat-private-messages"
                aria-label="Messages du salon"
            >
                {loading && (
                    <p className="text-secondary">
                        Chargement des messages...
                    </p>
                )}

                {!loading && messages.length === 0 && (
                    <p className="text-secondary">
                        Aucun message pour le moment. Lancez la discussion !
                    </p>
                )}

                {messages.map((message, index) => {
                    const isMine =
                        username !== "" &&
                        message.senderUsername === username;

                    const messageReactions = reactions[message.id] ?? {};

                   
                    return (
                        <article
                            key={`${message.id ?? "message"}-${message.createdAt}-${index}`}
                            className={`chat-private-message-row ${
                                isMine ? "mine" : "theirs"
                            }`}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "flex-end",
                                    gap: "6px",
                                    flexDirection: isMine ? "row-reverse" : "row",
                                    width: "fit-content",
                                    maxWidth: "100%",
                                }}
                            >
                                <div
                                    className={`chat-private-bubble ${
                                        isMine ? "mine" : ""
                                    }`}
                                    style={{ position: "relative" }}
                                >
                                    <div className="chat-message-author">
                                        {message.senderUsername}
                                    </div>

                                    <div className="chat-private-message-content">
                                        {renderMessageContent(message.content)}
                                    </div>

                                    <div className="chat-message-date">
                                        {new Date(
                                            message.createdAt
                                        ).toLocaleString()}
                                    </div>

                                    {Object.entries(messageReactions).some(
                                        ([, userIds]) => userIds.length > 0
                                    ) && (
                                        <div
                                            style={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                gap: "4px",
                                                marginTop: "5px",
                                            }}
                                        >
                                            {Object.entries(messageReactions).map(
                                                ([emoji, userIds]) =>
                                                    userIds.length > 0 && (
                                                        <button
                                                            key={emoji}
                                                            type="button"
                                                            onClick={() =>
                                                                void handleReaction(
                                                                    message.id,
                                                                    emoji
                                                                )
                                                            }
                                                            disabled={
                                                                reactingTo !== null
                                                            }
                                                            title={`${emoji} · ${userIds.length}`}
                                                            style={{
                                                                border: "1px solid #dee2e6",
                                                                borderRadius: "16px",
                                                                padding: "2px 8px",
                                                                background: "#fff",
                                                                cursor: "pointer",
                                                                fontSize: "14px",
                                                            }}
                                                        >
                                                            {emoji} {userIds.length}
                                                        </button>
                                                    )
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div
                                    style={{
                                        position: "relative",
                                        flexShrink: 0,
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setReactionPickerFor((previous) =>
                                                previous === message.id
                                                    ? null
                                                    : message.id
                                            )
                                        }
                                        disabled={reactingTo !== null}
                                        title="Ajouter une réaction"
                                        aria-label="Ajouter une réaction"
                                        style={{
                                            border: "1px solid #dee2e6",
                                            borderRadius: "50%",
                                            width: "30px",
                                            height: "30px",
                                            padding: 0,
                                            background: "#fff",
                                            cursor: "pointer",
                                            boxShadow: "0 1px 4px #0002",
                                        }}
                                    >
                                        😊
                                    </button>

                                    {reactionPickerFor === message.id && (
                                        <div
                                            style={{
                                                position: "fixed",
                                                bottom: "auto",
                                                left: "50%",
                                                transform: "translateX(-50%)",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "5px",
                                                padding: "7px 9px",
                                                background: "#fff",
                                                border: "1px solid #dee2e6",
                                                borderRadius: "24px",
                                                boxShadow: "0 2px 10px #0002",
                                                zIndex: 9999,
                                            }}
                                        >
                                            {REACTION_EMOJIS.map((emoji) => (
                                                <button
                                                    key={emoji}
                                                    type="button"
                                                    onClick={() =>
                                                        void handleReaction(
                                                            message.id,
                                                            emoji
                                                        )
                                                    }
                                                    disabled={reactingTo !== null}
                                                    title={emoji}
                                                    aria-label={`Réagir avec ${emoji}`}
                                                    style={{
                                                        border: "none",
                                                        borderRadius: "50%",
                                                        background: "transparent",
                                                        fontSize: "21px",
                                                        padding: "2px",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </article>
                    );

                })}
            </div>

            <footer className="chat-private-composer">
                {previewUrl && (
                    <div className="chat-private-preview">
                        <img src={previewUrl} alt="Aperçu avant envoi" />

                        <div className="chat-private-preview-info">
                            <strong>{selectedFile?.name}</strong>
                            <small>Image prête à être envoyée</small>

                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={removeSelectedFile}
                                disabled={sending}
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSend}>
                    {showEmojiPicker && (
                        <div
                            className="chat-emoji-picker"
                            aria-label="Choisir un émoji"
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(8, 1fr)",
                                gap: "6px",
                                padding: "12px",
                                marginBottom: "8px",
                                border: "1px solid #dee2e6",
                                borderRadius: "8px",
                                maxWidth: "360px",
                            }}
                        >
                            {EMOJIS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => insertEmoji(emoji)}
                                    disabled={sending}
                                    aria-label={`Insérer ${emoji}`}
                                    style={{
                                        border: "none",
                                        background: "transparent",
                                        fontSize: "24px",
                                        cursor: "pointer",
                                        padding: "4px",
                                    }}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="chat-private-input-row">
                        <input
                            ref={inputRef}
                            id="room-message"
                            className="form-control"
                            type="text"
                            maxLength={5000}
                            value={content}
                            onChange={(event) =>
                                setContent(event.target.value)
                            }
                            placeholder="Écrire un message..."
                            disabled={sending}
                        />

                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() =>
                                setShowEmojiPicker((previous) => !previous)
                            }
                            disabled={sending}
                            title="Choisir un émoji"
                            aria-label="Choisir un émoji"
                        >
                            😊
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="d-none"
                            onChange={handleFileChange}
                            disabled={sending}
                        />

                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={sending}
                            title="Joindre une image ou un GIF"
                        >
                            Image/GIF
                        </button>

                        <button
                            className="btn btn-primary"
                            type="submit"
                            disabled={
                                sending ||
                                (!content.trim() && !selectedFile)
                            }
                        >
                            {sending ? "Envoi..." : "Envoyer"}
                        </button>
                    </div>

                    <small className="text-secondary d-block mt-2">
                        JPEG, PNG, GIF ou WebP · 5 Mo maximum
                    </small>
                </form>
            </footer>
        </section>
    );
}
