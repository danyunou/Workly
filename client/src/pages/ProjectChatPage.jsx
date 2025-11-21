// src/pages/ProjectChatPage.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar"; // o FreelancerNavbar según prefieras
import "../styles/projectChat.css";

export default function ProjectChatPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState(null);

  const bottomRef = useRef(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Cargar datos básicos del proyecto (si tienes endpoint)
        const projectRes = await fetch(
          `https://workly-cy4b.onrender.com/api/projects/${projectId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (projectRes.ok) {
          const projectData = await projectRes.json();
          setProject(projectData);
        }

        // 2) Obtener conversación ligada al proyecto
        const convRes = await fetch(
          `https://workly-cy4b.onrender.com/api/conversations/by-project/${projectId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!convRes.ok) {
          throw new Error("No se encontró conversación para este proyecto.");
        }

        const convData = await convRes.json();
        setConversation(convData);

        // 3) Cargar mensajes
        await fetchMessages(convData.id);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error al cargar el chat del proyecto.");
      } finally {
        setLoading(false);
      }
    };

    const fetchMessages = async (conversationId) => {
      try {
        setLoadingMessages(true);
        const res = await fetch(
          `https://workly-cy4b.onrender.com/api/conversations/${conversationId}/messages`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error("Error al cargar mensajes.");
        }

        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error al cargar mensajes.");
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchData();
  }, [projectId, token, navigate]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!conversation || !content.trim()) return;

    try {
      const res = await fetch(
        `https://workly-cy4b.onrender.com/api/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        }
      );

      if (!res.ok) {
        throw new Error("Error al enviar mensaje.");
      }

      const newMessage = await res.json();
      setMessages((prev) => [...prev, newMessage]);
      setContent("");
    } catch (err) {
      console.error(err);
      alert(err.message || "No se pudo enviar el mensaje.");
    }
  };

  if (!token) return null;

  return (
    <div className="dashboard-page">
      <Navbar />
      <div className="project-chat-container">
        <div className="project-chat-header">
          <div>
            <h2 className="project-chat-title">
              Chat del proyecto
              {project && ` #${project.id}`}
            </h2>
            {project && (
              <p className="project-chat-subtitle">
                {project.title
                  ? project.title
                  : "Aquí se registran todas las conversaciones y acuerdos de este proyecto."}
              </p>
            )}
          </div>

          <button
            className="project-chat-back-btn"
            onClick={() => navigate(-1)}
          >
            Volver
          </button>
        </div>

        <div className="project-chat-banner">
          🔒 Esta conversación y el alcance del proyecto se usarán como
          referencia en caso de disputas. Asegúrate de que todo lo acordado
          quede por escrito aquí.
        </div>

        {loading && <p>Cargando información del proyecto...</p>}
        {error && <p className="project-chat-error">{error}</p>}

        {!loading && conversation && (
          <div className="project-chat-layout">
            {/* Columna izquierda: resumen del proyecto */}
            <aside className="project-chat-sidebar">
              <h3>Resumen del proyecto</h3>
              {project ? (
                <div className="project-chat-card">
                  <p>
                    <span className="label">Proyecto:</span>{" "}
                    {project.title || `#${project.id}`}
                  </p>
                  <p>
                    <span className="label">Estado:</span>{" "}
                    <span className={`status-badge status-${project.status}`}>
                      {project.status}
                    </span>
                  </p>
                  {project.contract_price && (
                    <p>
                      <span className="label">Monto:</span> $
                      {Number(project.contract_price).toLocaleString("es-MX")}
                    </p>
                  )}
                  {project.contract_deadline && (
                    <p>
                      <span className="label">Fecha límite:</span>{" "}
                      {new Date(project.contract_deadline).toLocaleDateString(
                        "es-MX"
                      )}
                    </p>
                  )}
                  <button
                    className="project-chat-contract-btn"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    Ver contrato y entregables
                  </button>
                </div>
              ) : (
                <p>No se pudo cargar la información del proyecto.</p>
              )}
            </aside>

            {/* Columna derecha: chat */}
            <section className="project-chat-panel">
              <div className="chat-messages">
                {loadingMessages && <p>Cargando mensajes...</p>}
                {!loadingMessages && messages.length === 0 && (
                  <p className="chat-empty">Aún no hay mensajes.</p>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-message ${
                      msg.type === "system" ? "chat-message-system" : ""
                    }`}
                  >
                    <div className="chat-message-meta">
                      {msg.type === "system" ? (
                        <span className="chat-system-label">Sistema</span>
                      ) : (
                        <span className="chat-username">
                          {msg.username || "Usuario"}
                        </span>
                      )}
                      <span className="chat-date">
                        {new Date(msg.created_at).toLocaleString("es-MX")}
                      </span>
                    </div>
                    <div className="chat-message-content">{msg.content}</div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <form className="chat-input-wrapper" onSubmit={handleSend}>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escribe un mensaje para el cliente/freelancer..."
                  rows={3}
                />
                <div className="chat-input-actions">
                  {/* Aquí luego puedes agregar botón de adjuntar archivos */}
                  <button type="submit">Enviar</button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
