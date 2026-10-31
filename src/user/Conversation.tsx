
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CustomError } from "../model/CustomError";
import { useMessagingStore } from "../store/messagingStore";
import { getMessages, sendMessage, toggleMessageReaction,} from "./messagesApi";
import { getUsers, type PublicUser } from "./usersApi";
import { uploadImage } from "./uploadApi";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const EMOJIS = [
  "😀", "😂", "🥹", "😍", "🥰", "😘",
  "😊", "😎", "😭", "😡", "❤️", "💕",
  "👍", "👎", "👏", "🙏", "🔥", "🎉",
  "💯", "🤔", "😉", "😴", "🤗", "🙌",
];
const MESSAGE_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "👏"];
function renderMessageContent(content: string) {
  const urlRegex = /(https?:\/\/\S+)/g;
  const parts = content.split(urlRegex);

  return parts.map((part, index) => {
    const cleanUrl = part.replace(/[.,!?;:)]+$/, "");
    const punctuation = part.slice(cleanUrl.length);

    if (
      /^https?:\/\//i.test(cleanUrl) &&
      /\.(jpe?g|png|gif|webp)(?:[?#].*)?$/i.test(cleanUrl)
    ) {
      return (
        <span key={`${index}-${cleanUrl}`}>
          <a href={cleanUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={cleanUrl}
              alt="Image envoyée"
              loading="lazy"
              className="chat-private-image"
            />
          </a>
          {punctuation}
        </span>
      );
    }

    return <span key={`${index}-${part}`}>{part}</span>;
  });
}

export function Conversation() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const users = useMessagingStore((state) => state.users);
  const setUsers = useMessagingStore((state) => state.setUsers);
  const selectUser = useMessagingStore((state) => state.selectUser);
  const messages = useMessagingStore((state) => state.messages);
  const setMessages = useMessagingStore((state) => state.setMessages);
  const addMessage = useMessagingStore((state) => state.addMessage);

  const [targetUser, setTargetUser] = useState<PublicUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const messagesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUserId = Number(sessionStorage.getItem("userId"));
  const targetId = Number(userId);

  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
const [reactingTo, setReactingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionStorage.getItem("token")) {
      navigate("/login", { replace: true });
      return;
    }

    if (!Number.isInteger(targetId) || targetId <= 0) {
      navigate("/users", { replace: true });
      return;
    }

    const existingUser = users.find(
      (user) => user.user_id === targetId
    );

    if (existingUser) {
      setTargetUser(existingUser);
      return;
    }

    getUsers(
      (result) => {
        setUsers(result);

        const found = result.find(
          (user) => user.user_id === targetId
        );

        if (found) {
          setTargetUser(found);
        } else {
          setError("Cet utilisateur est introuvable.");
        }
      },
      (apiError: CustomError) => {
        setError(apiError.message);

        if (apiError.httpStatus === 401) {
          sessionStorage.clear();
          navigate("/login", { replace: true });
        }
      }
    );
  }, [navigate, setUsers, targetId, users]);

  const loadMessages = useCallback(async () => {
    try {
      const result = await getMessages(targetId);
      setMessages(result);
      setError("");
    } catch (apiError) {
      const message =
        apiError instanceof Error
          ? apiError.message
          : "Impossible de charger les messages.";

      setError(message);

      if (
        apiError instanceof CustomError &&
        apiError.httpStatus === 401
      ) {
        sessionStorage.clear();
        navigate("/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, setMessages, targetId]);

  useEffect(() => {
    if (!targetUser) return;

    selectUser(targetUser);
    setLoading(true);
    void loadMessages();

    const intervalId = window.setInterval(() => {
      void loadMessages();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [loadMessages, selectUser, targetUser]);

  // Fermer le profil avec la touche Échap.
  useEffect(() => {
    if (!showProfile) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowProfile(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showProfile]);

  // Faire défiler uniquement la zone des messages.
  useEffect(() => {
    const container = messagesRef.current;

    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setError("");

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Formats acceptés : JPEG, PNG, GIF et WebP.");
      event.target.value = "";
      return;
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      setError("L'image doit peser au maximum 5 Mo.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  function removeSelectedFile() {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function insertEmoji(emoji: string) {
    const input = inputRef.current;

    if (!input) {
      setContent((previous) => previous + emoji);
      return;
    }

    const start = input.selectionStart ?? content.length;
    const end = input.selectionEnd ?? content.length;
    const updatedContent =
      content.slice(0, start) + emoji + content.slice(end);

    setContent(updatedContent);
    setShowEmojiPicker(false);

    requestAnimationFrame(() => {
      input.focus();
      const cursorPosition = start + emoji.length;
      input.setSelectionRange(cursorPosition, cursorPosition);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = content.trim();

    if ((!text && !selectedFile) || sending || !targetUser) return;

    setSending(true);
    setError("");

    try {
      let messageContent = text;

      if (selectedFile) {
        const uploaded = await uploadImage(selectedFile);

        messageContent = text
          ? `${text}\n${uploaded.url}`
          : uploaded.url;
      }

      const sentMessage = await sendMessage(targetId, messageContent);
      addMessage(sentMessage);

      setContent("");
      setSelectedFile(null);
      setShowEmojiPicker(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (apiError) {
      setError(
        apiError instanceof Error
          ? apiError.message
          : "Impossible d'envoyer le message ou l'image."
      );
    } finally {
      setSending(false);
    }
  }
  async function handleMessageReaction(
  messageId: string,
  emoji: string
) {
  if (reactingTo || !targetId) return;

  setReactingTo(messageId);
  setError("");

  try {
    const reactions = await toggleMessageReaction(
      targetId,
      messageId,
      emoji
    );

    setMessages(
      messages.map((message) =>
        message.id === messageId
          ? { ...message, reactions }
          : message
      )
    );

    setReactionPickerFor(null);
  } catch (apiError) {
    setError(
      apiError instanceof Error
        ? apiError.message
        : "Impossible de modifier la réaction."
    );
  } finally {
    setReactingTo(null);
  }
}

  return (
    <section className="chat-private-conversation">
      <header className="chat-private-header">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => navigate("/users")}
        >
          Retour
        </button>

        <button
          type="button"
          className="chat-profile-trigger"
          onClick={() => setShowProfile(true)}
          disabled={!targetUser}
          aria-label={`Voir le profil de ${targetUser?.username || "cet utilisateur"}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            border: "none",
            background: "transparent",
            color: "inherit",
            cursor: targetUser ? "pointer" : "default",
            textAlign: "left",
            padding: "4px 8px",
            borderRadius: "10px",
          }}
        >
          <img
            src={targetUser?.avatar_url || "/default-avatar.png"}
            alt=""
            onError={(event) => {
              event.currentTarget.src = "/default-avatar.png";
            }}
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />

          <span>
            <strong style={{ display: "block" }}>
              {targetUser?.username || "Conversation"}
            </strong>
            <small>Voir le profil</small>
          </span>
        </button>
      </header>

      {showProfile && targetUser && (
        <div
          role="presentation"
          onClick={() => setShowProfile(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(0, 0, 0, 0.7)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-profile-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "360px",
              padding: "28px 24px",
              border: "1px solid #35354b",
              borderRadius: "18px",
              background: "#11111b",
              color: "#f1f0fa",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
            }}
          >
            <button
              type="button"
              onClick={() => setShowProfile(false)}
              aria-label="Fermer le profil"
              style={{
                position: "absolute",
                top: "12px",
                right: "14px",
                border: "none",
                background: "transparent",
                color: "#f1f0fa",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              ×
            </button>

            <img
              src={targetUser.avatar_url || "/default-avatar.png"}
              alt={`Photo de ${targetUser.username}`}
              onError={(event) => {
                event.currentTarget.src = "/default-avatar.png";
              }}
              style={{
                width: "112px",
                height: "112px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid #8b5cf6",
                marginBottom: "16px",
              }}
            />

            <h2
              id="chat-profile-title"
              style={{
                fontSize: "1.4rem",
                marginBottom: "18px",
                overflowWrap: "anywhere",
              }}
            >
              {targetUser.username}
            </h2>

            <div
              style={{
                padding: "12px",
                borderRadius: "10px",
                background: "#1b1b29",
                textAlign: "left",
              }}
            >
              <div>
                <strong>Dernière connexion : </strong>
                <span style={{ color: "#b8b6ca" }}>
                  {targetUser.last_login || "Inconnue"}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowProfile(false)}
              style={{ marginTop: "20px" }}
            >
              Fermer
            </button>
          </section>
        </div>
      )}

      <div
        ref={messagesRef}
        className="chat-private-messages"
        aria-label="Messages privés"
        aria-live="polite"
      >
        {loading && (
          <p className="text-secondary text-center">
            Chargement des messages...
          </p>
        )}

        {!loading && messages.length === 0 && !error && (
          <p className="text-secondary text-center">
            Aucun message pour le moment. Lancez la discussion !
          </p>
        )}

        
{messages.map((message, index) => {
  const isMine = message.senderId === currentUserId;
  const messageId = message.id;
  const reactions = message.reactions ?? {};

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
          maxWidth: "100%",
          minWidth: 0,
        }}
      >
        <div style={{ position: "relative", minWidth: 0, maxWidth: "100%" }}>
          <div
            className={`chat-private-bubble ${isMine ? "mine" : ""}`}
          >
            <div className="chat-message-author">
              {isMine ? "Vous" : message.senderUsername}
            </div>

            <div className="chat-private-message-content">
              {renderMessageContent(message.content)}
            </div>

            <div className="chat-message-date">
              {new Date(message.createdAt).toLocaleString("fr-FR")}
            </div>

            {Object.keys(reactions).length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "5px",
                  marginTop: "8px",
                }}
              >
                {Object.entries(reactions).map(([emoji, userIds]) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      if (messageId) {
                        void handleMessageReaction(messageId, emoji);
                      }
                    }}
                    disabled={!messageId || reactingTo === messageId}
                    title={`${userIds.length} réaction(s)`}
                    aria-label={`${emoji}, ${userIds.length} réaction(s)`}
                    style={{
                      border: "1px solid #777",
                      borderRadius: "12px",
                      padding: "2px 7px",
                      background: userIds.some(
                        (id) => Number(id) === currentUserId
                      )
                        ? "#514078"
                        : "transparent",
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    {emoji} {userIds.length}
                  </button>
                ))}
              </div>
            )}
          </div>

          {reactionPickerFor === messageId && messageId && (
            <div
              role="group"
              aria-label="Réagir au message"
              style={{
                position: "absolute",
                bottom: "100%",
                [isMine ? "right" : "left"]: 0,
                zIndex: 10,
                display: "flex",
                gap: "4px",
                padding: "6px",
                marginBottom: "4px",
                border: "1px solid #454557",
                borderRadius: "20px",
                background: "#11111b",
                boxShadow: "0 4px 12px rgba(0,0,0,.3)",
              }}
            >
              {MESSAGE_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    void handleMessageReaction(messageId, emoji);
                  }}
                  disabled={reactingTo === messageId}
                  aria-label={`Réagir avec ${emoji}`}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "inherit",
                    fontSize: "20px",
                    padding: "3px",
                    cursor: "pointer",
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            if (!messageId) return;
            setReactionPickerFor((previous) =>
              previous === messageId ? null : messageId
            );
          }}
          disabled={!messageId || reactingTo === messageId}
          aria-label="Ajouter une réaction"
          title="Réagir au message"
          style={{
            border: "none",
            background: "transparent",
            color: "inherit",
            fontSize: "18px",
            padding: "3px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          😊
        </button>
      </div>
    </article>
  );
})}

      </div>

      {error && (
        <div className="alert alert-danger m-2" role="alert">
          {error}
        </div>
      )}

      <footer className="chat-private-composer">
        {selectedFile && previewUrl && (
          <div className="chat-private-preview">
            <img src={previewUrl} alt="Aperçu avant envoi" />

            <div className="chat-private-preview-info">
              <span>{selectedFile.name}</span>
              <small>
                {(selectedFile.size / 1024).toFixed(0)} Ko
              </small>

              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={removeSelectedFile}
                disabled={sending}
              >
                Retirer
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {showEmojiPicker && (
            <div
              role="group"
              aria-label="Choisir une émoticône"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                gap: "8px",
                padding: "12px",
                background: "#11111b",
                border: "1px solid #35354b",
                borderRadius: "10px",
                marginBottom: "10px",
              }}
            >
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  aria-label={`Ajouter ${emoji}`}
                  style={{
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px",
                    background: "transparent",
                    color: "inherit",
                    fontSize: "23px",
                    cursor: "pointer",
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
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="form-control"
              type="text"
              placeholder="Écrire un message..."
              maxLength={5000}
              disabled={!targetUser || sending}
              aria-label="Votre message"
            />

            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowEmojiPicker((previous) => !previous)}
              disabled={!targetUser || sending}
              aria-label="Afficher les émoticônes"
              title="Ajouter une émoticône"
            >
              😊
            </button>

            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={!targetUser || sending}
              title="Joindre une image ou un GIF"
            >
              Image/GIF
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                (!content.trim() && !selectedFile) ||
                sending ||
                !targetUser
              }
            >
              {sending ? "Envoi..." : "Envoyer"}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="d-none"
            onChange={handleFileChange}
            disabled={sending}
          />

          <small className="text-secondary d-block mt-2">
            JPEG, PNG, GIF ou WebP — 5 Mo maximum.
          </small>
        </form>
      </footer>
    </section>
  );
}
