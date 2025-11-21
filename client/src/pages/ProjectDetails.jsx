import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/projectDetail.css";
import { jwtDecode } from "jwt-decode";
import { PayPalButtons } from "@paypal/react-paypal-js";
import Navbar from "../components/Navbar";
import FreelancerNavbar from "../components/FreelancerNavbar";

const API_BASE = "https://workly-cy4b.onrender.com";

export default function ProjectDetail() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  // Proyecto y rol
  const [project, setProject] = useState(null);
  const [roleId, setRoleId] = useState(null);

  const isClient = roleId === 1;
  const isFreelancer = roleId === 2;

  // Entregables
  const [file, setFile] = useState(null);
  const [deliverables, setDeliverables] = useState([]);
  const [reuploadFiles, setReuploadFiles] = useState({});

  // Disputas
  const [disputeReason, setDisputeReason] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [dispute, setDispute] = useState(null);
  const [disputeLogs, setDisputeLogs] = useState([]);
  const [showResubmitForm, setShowResubmitForm] = useState(false);
  const [disputeLimitReached, setDisputeLimitReached] = useState(false);

  // Contrato (edición rápida de monto y fecha) -> ahora en modal
  const [showEditContract, setShowEditContract] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editDeadline, setEditDeadline] = useState("");

  // Chat
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Alcance / scope
  const [currentScope, setCurrentScope] = useState(null);
  const [scopeHistory, setScopeHistory] = useState([]);
  const [loadingScope, setLoadingScope] = useState(false);
  const [activeScopeTab, setActiveScopeTab] = useState("scope"); // scope | history
  const [isNewScopeOpen, setIsNewScopeOpen] = useState(false);
  const [newScopeForm, setNewScopeForm] = useState({
    title: "",
    description: "",
    deliverables: "",
    exclusions: "",
    revision_limit: "",
    deadline: "",
    price: "",
  });

  const [error, setError] = useState(null);

  const bottomRef = useRef(null);

  // Helpers
  const getToken = () => localStorage.getItem("token");

  const formatDate = (value) => {
    if (!value) return "Por confirmar";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Por confirmar";
    return d.toLocaleDateString("es-MX");
  };

  const canEditContract = (project) => {
    if (!project) return false;
    const blockedStatuses = ["in_progress", "in_revision", "completed", "cancelled"];
    return !blockedStatuses.includes(project.status);
  };

  // === Carga inicial: rol + proyecto ===
  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const decoded = jwtDecode(token);
      setRoleId(decoded.role_id);
    } catch (e) {
      console.error("Error al decodificar token:", e);
    }

    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, navigate]);

  const fetchProject = () => {
    const token = getToken();
    axios
      .get(`${API_BASE}/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setProject(res.data))
      .catch((err) =>
        console.error("Error al obtener detalle del proyecto:", err)
      );
  };

  // === Entregables ===
  const fetchDeliverables = async () => {
    const token = getToken();
    try {
      const res = await axios.get(
        `${API_BASE}/api/projects/${projectId}/deliverables`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDeliverables(res.data);
    } catch (err) {
      console.error("Error al obtener entregables:", err);
    }
  };

  const handleUpload = async (e, deliverableId = null) => {
    e.preventDefault();
    const uploadFile = deliverableId ? reuploadFiles[deliverableId] : file;
    if (!uploadFile) return;

    const token = getToken();
    const formData = new FormData();
    formData.append("deliverable", uploadFile);
    formData.append("projectId", projectId);
    if (deliverableId) formData.append("deliverableId", deliverableId);

    try {
      await axios.post(`${API_BASE}/api/projects/upload-deliverable`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Archivo enviado correctamente");
      fetchDeliverables();
      if (!deliverableId) {
        setFile(null);
      } else {
        setReuploadFiles((prev) => ({
          ...prev,
          [deliverableId]: null,
        }));
      }
    } catch (error) {
      console.error("Error al subir entregable:", error);
      alert("Error al subir el entregable");
    }
  };

  const approveDeliverable = async (deliverableId) => {
    const token = getToken();
    try {
      await axios.post(
        `${API_BASE}/api/projects/deliverables/${deliverableId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchDeliverables();
    } catch (err) {
      console.error("Error al aprobar entregable:", err);
    }
  };

  const rejectDeliverable = async (deliverableId) => {
    const reason = prompt("¿Por qué estás rechazando este entregable?");
    if (!reason) return;

    const token = getToken();
    try {
      await axios.post(
        `${API_BASE}/api/projects/deliverables/${deliverableId}/reject`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchDeliverables();
    } catch (err) {
      console.error("Error al rechazar entregable:", err);
    }
  };

  const approveProject = async () => {
    const token = getToken();
    try {
      await axios.post(
        `${API_BASE}/api/projects/${projectId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchProject();
    } catch (err) {
      console.error("Error al aprobar proyecto:", err);
    }
  };

  // === Disputas ===
  const fetchDispute = async () => {
    const token = getToken();
    try {
      const response = await axios.get(
        `${API_BASE}/api/disputes/by-project/${projectId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = response.data;
      setDispute(data.user || null);

      if (data.all.length >= 5) {
        setDisputeLimitReached(true);
      } else {
        setDisputeLimitReached(false);
      }
    } catch (err) {
      console.error("Error al obtener disputa:", err);
    }
  };

  useEffect(() => {
    if (dispute) {
      fetch(
        `${API_BASE}/api/disputes/${dispute.id}/logs`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      )
        .then((res) => res.json())
        .then((data) => setDisputeLogs(data))
        .catch((err) =>
          console.error("Error al cargar logs de disputa:", err)
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispute]);

  const submitDispute = async (e) => {
    e.preventDefault();

    const token = getToken();
    const reasonText = disputeReason.trim();

    if (dispute && dispute.status === "pendiente") {
      alert("Ya tienes una disputa abierta. Espera a que sea resuelta.");
      return;
    }

    if (!reasonText || !policyAccepted) {
      alert("Debes describir el motivo de la disputa y aceptar la política.");
      return;
    }

    try {
      await axios.post(
        `${API_BASE}/api/disputes`,
        {
          projectId,
          description: reasonText,
          policyAccepted,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Disputa enviada correctamente.");
      setDisputeReason("");
      setPolicyAccepted(false);
      await fetchDispute();
    } catch (error) {
      console.error("Error al enviar disputa:", error);
      const message =
        error.response?.data?.error || "No se pudo enviar la disputa.";
      alert(message);
    }
  };

  // === Contrato: aceptar y editar ===
  const handleAccept = () => {
    const token = getToken();
    axios
      .post(
        `${API_BASE}/api/projects/${projectId}/accept`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then(() => fetchProject())
      .catch((err) => console.error("Error al aceptar contrato:", err));
  };

  const openEditContract = () => {
    if (!project) return;
    setEditAmount(project.amount || project.contract_price || "");
    if (project.deadline || project.contract_deadline) {
      const d = new Date(project.deadline || project.contract_deadline);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      setEditDeadline(`${yyyy}-${mm}-${dd}`);
    } else {
      setEditDeadline("");
    }
    setShowEditContract(true);
  };

  const handleUpdateContract = async (e) => {
    e.preventDefault();
    const token = getToken();

    try {
      await axios.patch(
        `${API_BASE}/api/projects/${projectId}/contract`,
        {
          contract_price:
            editAmount !== "" ? parseFloat(editAmount) : undefined,
          contract_deadline: editDeadline || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      alert("Contrato actualizado. Ambos deberán aceptarlo de nuevo.");
      setShowEditContract(false);
      fetchProject();
    } catch (err) {
      console.error("Error al actualizar contrato:", err);
      const message =
        err.response?.data?.error || "No se pudo actualizar el contrato.";
      alert(message);
    }
  };

  // === Chat & Scope ===
  const fetchMessages = async (conversationId) => {
    const token = getToken();
    try {
      setLoadingMessages(true);
      const res = await fetch(
        `${API_BASE}/api/conversations/${conversationId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Error al cargar mensajes.");

      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar mensajes.");
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchConversationAndMessages = async () => {
    const token = getToken();
    try {
      const convRes = await fetch(
        `${API_BASE}/api/conversations/by-project/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!convRes.ok) {
        console.error("No se encontró conversación para este proyecto.");
        return;
      }

      const convData = await convRes.json();
      setConversation(convData);
      await fetchMessages(convData.id);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar el chat del proyecto.");
    }
  };

  const fetchScope = async () => {
    if (!projectId) return;
    const token = getToken();
    try {
      setLoadingScope(true);
      setError(null);

      // Alcance actual
      const currentRes = await fetch(
        `${API_BASE}/api/projects/${projectId}/scope/current`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (currentRes.ok) {
        const currentData = await currentRes.json();
        setCurrentScope(currentData);
      } else if (currentRes.status === 404) {
        setCurrentScope(null);
      }

      // Historial
      const historyRes = await fetch(
        `${API_BASE}/api/projects/${projectId}/scope/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setScopeHistory(historyData);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar el alcance del proyecto.");
    } finally {
      setLoadingScope(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!conversation || !content.trim()) return;

    const token = getToken();

    try {
      const res = await fetch(
        `${API_BASE}/api/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        }
      );

      if (!res.ok) throw new Error("Error al enviar mensaje.");

      const newMessage = await res.json();
      setMessages((prev) => [...prev, newMessage]);
      setContent("");
    } catch (err) {
      console.error(err);
      alert(err.message || "No se pudo enviar el mensaje.");
    }
  };

  const handleNewScopeChange = (e) => {
    const { name, value } = e.target;
    setNewScopeForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateScopeVersion = async (e) => {
    e.preventDefault();
    const token = getToken();
    try {
      const payload = {
        title: newScopeForm.title,
        description: newScopeForm.description,
        deliverables: newScopeForm.deliverables,
        exclusions: newScopeForm.exclusions,
        revision_limit: newScopeForm.revision_limit
          ? Number(newScopeForm.revision_limit)
          : null,
        deadline: newScopeForm.deadline || null,
        price: newScopeForm.price ? Number(newScopeForm.price) : null,
      };

      const res = await fetch(
        `${API_BASE}/api/projects/${projectId}/scope`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo crear la nueva versión.");
      }

      setNewScopeForm({
        title: "",
        description: "",
        deliverables: "",
        exclusions: "",
        revision_limit: "",
        deadline: "",
        price: "",
      });
      setIsNewScopeOpen(false);
      await fetchScope();
      await fetchProject();
    } catch (err) {
      console.error(err);
      alert(err.message || "Error al crear nueva versión del alcance.");
    }
  };

  // Cargar entregables, disputa, scope y chat cuando ya hay proyecto
  useEffect(() => {
    if (project) {
      fetchDeliverables();
      fetchDispute();
      fetchScope();
      fetchConversationAndMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  // Scroll al final del chat cuando cambian los mensajes
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Mensaje sugerido para freelancer cuando no hay historial de mensajes
  useEffect(() => {
    if (
      conversation &&
      isFreelancer &&
      messages.length === 0 &&
      !content
    ) {
      setContent(
        "Hola, gracias por confiar en mí 🙌 Platiquemos más sobre tus necesidades para dejar todo claro aquí."
      );
    }
  }, [conversation, isFreelancer, messages.length, content]);

  if (!project) {
    return (
      <>
        {isFreelancer ? <FreelancerNavbar /> : <Navbar />}
        <div className="project-detail project-detail-loading">
          Cargando proyecto...
        </div>
      </>
    );
  }

  const {
    service_title,
    status,
    started_at,
    client_name,
    freelancer_name,
    amount,
    description,
    client_accepted,
    freelancer_accepted,
    deadline,
    contract_price,
    contract_deadline,
  } = project;

  const lastLog =
    disputeLogs.length > 0 ? disputeLogs[disputeLogs.length - 1] : null;

  const bothAccepted = client_accepted && freelancer_accepted;

  // 🔒 Ahora sólo se puede aceptar contrato si existe alcance (currentScope)
  const showAcceptButton =
    !!currentScope &&
    (status === "awaiting_contract" || status === "pending_contract") &&
    ((isClient && !client_accepted) || (isFreelancer && !freelancer_accepted));

  const showPayPal =
    isClient &&
    bothAccepted &&
    (status === "awaiting_payment" || status === "pending_contract");

  return (
    <>
      {isFreelancer ? <FreelancerNavbar /> : <Navbar />}

      <div className="project-detail">
        {/* Header */}
        <div className="project-header">
          <div className="project-header-main">
            <h2>Proyecto #{project.id}</h2>
            <p className="project-header-subtitle">
              {service_title ||
                "Aquí se centralizan el contrato, el alcance, el chat y las entregas de este proyecto."}
            </p>

            <div className="project-header-meta">
              <span>
                <strong>Cliente:</strong> {client_name}
              </span>
              <span>
                <strong>Freelancer:</strong> {freelancer_name}
              </span>
              <span className={`status-pill status-${status}`}>
                {status}
              </span>
              {bothAccepted && (
                <span className="status-pill status-accepted">
                  Contrato aceptado por ambas partes
                </span>
              )}
            </div>
          </div>

          <div className="project-header-right">
            {showAcceptButton && (
              <button
                onClick={handleAccept}
                className="primary-btn"
              >
                {isClient
                  ? "Aceptar contrato (Cliente)"
                  : "Aceptar contrato (Freelancer)"}
              </button>
            )}

            {canEditContract(project) && (
              <button
                type="button"
                className="secondary-btn"
                onClick={openEditContract}
              >
                Editar contrato
              </button>
            )}

            {/* Nota para guiar al usuario si aún no hay alcance */}
            {!currentScope &&
              (status === "awaiting_contract" ||
                status === "pending_contract") && (
                <p className="contract-note">
                  Antes de aceptar el contrato, definan el{" "}
                  <strong>alcance del proyecto</strong> en la sección
                  “Alcance del proyecto”. Esto ayuda a proteger a ambas partes.
                </p>
              )}
          </div>
        </div>

        {error && <p className="project-error-msg">{error}</p>}

        {/* Layout principal: izquierda contrato/alcance, derecha chat */}
        <div className="project-main-layout">
          {/* Columna izquierda: contrato + alcance */}
          <aside className="project-left">
            {/* Resumen contrato */}
            <section className="card contract-summary-card">
              <h3>Contrato</h3>
              <div className="contract-summary-grid">
                <div>
                  <p>
                    <span className="label">Fecha de contrato:</span>{" "}
                    {started_at ? formatDate(started_at) : "Por confirmar"}
                  </p>
                  <p>
                    <span className="label">Monto del contrato:</span>{" "}
                    {amount || contract_price
                      ? `$${Number(amount || contract_price).toFixed(2)}`
                      : "Por definir"}
                  </p>
                  <p>
                    <span className="label">Fecha límite:</span>{" "}
                    {formatDate(deadline || contract_deadline)}
                  </p>
                </div>
                <div>
                  <p>
                    <span className="label">Estado de aceptación:</span>{" "}
                    {bothAccepted
                      ? "Aceptado por cliente y freelancer"
                      : "Pendiente de aceptación"}
                  </p>
                  <p>
                    <span className="label">Servicios contratados:</span>{" "}
                    {description || "Por definir"}
                  </p>
                </div>
              </div>
            </section>

            {/* Alcance / Scope */}
            <section className="card scope-card-wrapper">
              <div className="scope-header">
                <h3>Alcance del proyecto</h3>
                <span className="scope-badge">
                  Versión basada en project_scopes
                </span>
              </div>

              <div className="scope-tabs">
                <button
                  className={
                    activeScopeTab === "scope"
                      ? "scope-tab active"
                      : "scope-tab"
                  }
                  onClick={() => setActiveScopeTab("scope")}
                >
                  Alcance actual
                </button>
                <button
                  className={
                    activeScopeTab === "history"
                      ? "scope-tab active"
                      : "scope-tab"
                  }
                  onClick={() => setActiveScopeTab("history")}
                >
                  Historial de versiones
                </button>
              </div>

              <div className="scope-content">
                {loadingScope && <p>Cargando alcance...</p>}

                {!loadingScope && activeScopeTab === "scope" && (
                  <>
                    {currentScope ? (
                      <div className="scope-card-inner">
                        <p className="scope-version">
                          Versión {currentScope.version}
                        </p>
                        <h4>{currentScope.title}</h4>

                        <p className="scope-section-title">Descripción</p>
                        <p className="scope-text">
                          {currentScope.description}
                        </p>

                        {currentScope.deliverables && (
                          <>
                            <p className="scope-section-title">Entregables</p>
                            <ul className="scope-list">
                              {currentScope.deliverables
                                .split("\n")
                                .filter((line) => line.trim() !== "")
                                .map((line, idx) => (
                                  <li key={idx}>{line}</li>
                                ))}
                            </ul>
                          </>
                        )}

                        {currentScope.exclusions && (
                          <>
                            <p className="scope-section-title">No incluye</p>
                            <ul className="scope-list">
                              {currentScope.exclusions
                                .split("\n")
                                .filter((line) => line.trim() !== "")
                                .map((line, idx) => (
                                  <li key={idx}>{line}</li>
                                ))}
                            </ul>
                          </>
                        )}

                        <div className="scope-meta">
                          {currentScope.price && (
                            <span>
                              Monto sugerido: $
                              {Number(currentScope.price).toLocaleString(
                                "es-MX"
                              )}
                            </span>
                          )}
                          {currentScope.deadline && (
                            <span>
                              Fecha límite sugerida:{" "}
                              {formatDate(currentScope.deadline)}
                            </span>
                          )}
                          {currentScope.revision_limit != null && (
                            <span>
                              Revisiones máximas: {currentScope.revision_limit}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="scope-empty">
                        Aún no se ha definido un alcance formal para este
                        proyecto. Te recomendamos acordarlo por chat y luego
                        registrarlo aquí.
                      </p>
                    )}

                    <button
                      className="scope-new-btn"
                      onClick={() => setIsNewScopeOpen(true)}
                    >
                      Proponer nueva versión de alcance
                    </button>
                  </>
                )}

                {!loadingScope && activeScopeTab === "history" && (
                  <>
                    {scopeHistory.length === 0 ? (
                      <p className="scope-empty">
                        Aún no hay historial de versiones.
                      </p>
                    ) : (
                      <ul className="scope-history-list">
                        {scopeHistory.map((s) => (
                          <li key={s.id} className="scope-history-item">
                            <div className="scope-history-main">
                              <span className="scope-history-version">
                                Versión {s.version}
                              </span>
                              <span className="scope-history-title">
                                {s.title}
                              </span>
                            </div>
                            <div className="scope-history-meta">
                              <span>
                                Creado el{" "}
                                {new Date(
                                  s.created_at
                                ).toLocaleString("es-MX")}
                              </span>
                              {s.price && (
                                <span>
                                  Monto: $
                                  {Number(s.price).toLocaleString("es-MX")}
                                </span>
                              )}
                              {s.deadline && (
                                <span>
                                  Fecha límite: {formatDate(s.deadline)}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </section>
          </aside>

          {/* Columna derecha: chat */}
          <section className="project-right">
            <section className="card chat-card">
              <div className="chat-header">
                <div>
                  <h3>Chat del proyecto</h3>
                  <p>
                    🔒 Usa este espacio para acordar detalles, cambios y dudas.
                    Todo lo que quede escrito aquí se tomará como referencia en
                    caso de disputas.
                  </p>
                </div>
              </div>

              <div className="chat-messages">
                {loadingMessages && <p>Cargando mensajes...</p>}
                {!loadingMessages && messages.length === 0 && (
                  <p className="chat-empty">
                    Aún no hay mensajes. Inicia la conversación para alinear
                    expectativas.
                  </p>
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
                  placeholder={
                    isFreelancer
                      ? "Preséntate brevemente y pregunta por los detalles del proyecto..."
                      : "Escribe tus dudas o especificaciones para el freelancer..."
                  }
                  rows={3}
                />
                <div className="chat-input-actions">
                  <button type="submit">Enviar</button>
                </div>
              </form>
            </section>

            {/* Pago PayPal debajo del chat (cliente) */}
            {showPayPal && (
              <section className="card paypal-card">
                <h3>Pago del proyecto</h3>
                <p>
                  Una vez realizado el pago, el proyecto cambiará a estado{" "}
                  <strong>En progreso</strong> y el freelancer podrá comenzar a
                  trabajar.
                </p>
                <div style={{ maxWidth: "320px", marginTop: "1rem" }}>
                  <PayPalButtonWrapper
                    projectId={projectId}
                    onSuccess={fetchProject}
                  />
                </div>
              </section>
            )}
          </section>
        </div>

        {/* Entregables y aprobación de proyecto */}
        <section className="card section-card">
          <div className="section-header">
            <h3>Entregables</h3>
            {status === "in_progress" && isFreelancer && (
              <span className="section-badge">Freelancer</span>
            )}
          </div>

          {isFreelancer && status === "in_progress" && (
            <form
              onSubmit={handleUpload}
              className="upload-form-minimal"
            >
              <label htmlFor="file-upload" className="file-upload-label">
                Selecciona un archivo
                <input
                  type="file"
                  id="file-upload"
                  onChange={(e) => setFile(e.target.files[0])}
                  required
                  className="file-input"
                />
              </label>
              <button type="submit" className="minimal-btn">
                Subir entregable
              </button>
            </form>
          )}

          {["in_progress", "completed"].includes(status) &&
            deliverables.length > 0 && (
              <div className="deliverables">
                <ul className="deliverables-list">
                  {deliverables.map((d, index) => (
                    <li key={d.id} className="deliverable-item">
                      <div className="deliverable-main">
                        <a
                          href={d.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          📄 Ver archivo {index + 1}
                        </a>
                        <span className="deliverable-date">
                          – Subido el{" "}
                          {new Date(d.uploaded_at).toLocaleString("es-MX")}
                        </span>
                        {d.approved_by_client && (
                          <span className="deliverable-status deliverable-approved">
                            ✅ Aprobado
                          </span>
                        )}
                        {d.rejected_by_client && (
                          <span className="deliverable-status deliverable-rejected">
                            ❌ Rechazado por el cliente
                          </span>
                        )}
                      </div>

                      {isClient &&
                        !d.approved_by_client &&
                        !d.rejected_by_client && (
                          <div className="deliverable-actions">
                            <button
                              onClick={() => approveDeliverable(d.id)}
                              className="secondary-btn small"
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={() => rejectDeliverable(d.id)}
                              className="link-btn small danger"
                            >
                              Rechazar
                            </button>
                          </div>
                        )}

                      {d.rejected_by_client && d.rejection_message && (
                        <div className="deliverable-rejection-message">
                          Motivo: {d.rejection_message}
                        </div>
                      )}

                      {isFreelancer && d.rejected_by_client && (
                        <form
                          onSubmit={(e) => handleUpload(e, d.id)}
                          className="reupload-form-inline"
                        >
                          <label
                            htmlFor={`reupload-${d.id}`}
                            className="file-label"
                          >
                            Seleccionar archivo
                            <input
                              type="file"
                              id={`reupload-${d.id}`}
                              onChange={(e) =>
                                setReuploadFiles((prev) => ({
                                  ...prev,
                                  [d.id]: e.target.files[0],
                                }))
                              }
                              required
                              className="file-input-hidden"
                            />
                          </label>

                          <button
                            type="submit"
                            className="minimal-btn-small"
                          >
                            Reenviar
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {isClient &&
            status === "in_progress" &&
            deliverables.length > 0 &&
            deliverables.every((d) => d.approved_by_client) && (
              <button
                onClick={approveProject}
                className="primary-btn approve-project-btn"
              >
                ✅ Aprobar proyecto
              </button>
            )}
        </section>

        {/* Disputas */}
        {isClient && status === "completed" && (
          <section className="card section-card">
            <div className="section-header">
              <h3>Disputas</h3>
              <span className="section-badge">Cliente</span>
            </div>

            <p className="section-text">
              Si consideras que el trabajo entregado no cumple con lo acordado,
              puedes abrir una disputa. Un administrador revisará el caso con
              base en el alcance del proyecto y el chat.
            </p>

            <p className="section-text small">
              Lee nuestra{" "}
              <a href="/dispute-terms" target="_blank" rel="noreferrer">
                política de resolución de disputas
              </a>
              .
            </p>

            {disputeLimitReached && (
              <p className="dispute-warning">
                Este proyecto ha alcanzado el límite de disputas permitidas (5).
                Ya no es posible abrir nuevas disputas.
              </p>
            )}

            {!disputeLimitReached &&
              dispute &&
              dispute.status === "open" && (
                <p className="dispute-info">
                  Ya tienes una disputa abierta. El administrador está
                  revisándola.
                </p>
              )}

            {!disputeLimitReached &&
              dispute &&
              dispute.status === "rejected" &&
              !showResubmitForm && (
                <div className="dispute-rejected">
                  <p>
                    Tu disputa fue rechazada:{" "}
                    <strong>{dispute.admin_message}</strong>
                  </p>
                  <button
                    onClick={() => setShowResubmitForm(true)}
                    className="secondary-btn"
                  >
                    Volver a enviar disputa
                  </button>
                </div>
              )}

            {!disputeLimitReached &&
              (showResubmitForm || !dispute) &&
              (!dispute ||
                (dispute.status !== "irresoluble" &&
                  dispute.status !== "resuelta")) && (
                <form onSubmit={submitDispute} className="dispute-form">
                  <textarea
                    placeholder="Describe el motivo de la disputa"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    required
                    rows={4}
                  />
                  <label className="dispute-checkbox">
                    <input
                      type="checkbox"
                      checked={policyAccepted}
                      onChange={(e) => setPolicyAccepted(e.target.checked)}
                      required
                    />{" "}
                    Acepto la política de resolución de disputas.
                  </label>
                  <button
                    type="submit"
                    disabled={!policyAccepted}
                    className="primary-btn"
                  >
                    {dispute ? "Reenviar disputa" : "Abrir disputa"}
                  </button>
                </form>
              )}

            {lastLog && (
              <div className="dispute-log">
                <strong>Última decisión del administrador:</strong>
                <p>{lastLog.action_description}</p>
                <p className="dispute-log-date">
                  {new Date(lastLog.timestamp).toLocaleString("es-MX")}
                </p>
              </div>
            )}
          </section>
        )}

        {/* 🧭 Mini tutorial / Cómo funciona este proyecto */}
        <section className="card tutorial-card">
          <h3>¿Cómo funciona este proyecto en Workly?</h3>
          <ol>
            <li>
              <strong>Hablen en el chat</strong> para aclarar dudas y acordar
              exactamente qué se va a entregar.
            </li>
            <li>
              <strong>Definan el alcance</strong> en la sección
              “Alcance del proyecto” (texto, entregables, exclusiones,
              fechas, revisiones).
            </li>
            <li>
              <strong>Acepten el contrato</strong> cuando ambos estén de
              acuerdo con el alcance y el monto.
            </li>
            <li>
              <strong>Realiza el pago</strong> (cliente) para que el proyecto
              pase a <em>En progreso</em>.
            </li>
            <li>
              <strong>Sube y revisa entregables</strong>. Si algo no cuadra,
              discútanlo en el chat y ajusten el alcance si es necesario.
            </li>
            <li>
              Si hay un conflicto serio, el cliente puede{" "}
              <strong>abrir una disputa</strong> y el equipo de Workly revisará
              el caso usando el alcance y el chat como referencia.
            </li>
          </ol>
          <p className="tutorial-footer">
            Para más detalles, pronto podrás consultar la página{" "}
            <strong>“Cómo funciona Workly”</strong> desde el menú principal.
          </p>
        </section>
      </div>

      {/* === MODAL EDITAR CONTRATO === */}
      {showEditContract && (
        <div
          className="modal-backdrop"
          onClick={() => setShowEditContract(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Editar contrato</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowEditContract(false)}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleUpdateContract}
              className="modal-body edit-contract-form"
            >
              <div className="form-row">
                <label>
                  Monto del contrato (USD)
                  <input
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                  />
                </label>
                <label>
                  Fecha límite
                  <input
                    type="date"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                  />
                </label>
              </div>
              <p className="form-helper">
                Al modificar el contrato, las aceptaciones de cliente y
                freelancer se reiniciarán y deberán aprobarlo nuevamente.
              </p>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowEditContract(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="primary-btn">
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === MODAL NUEVA VERSIÓN DE ALCANCE === */}
      {isNewScopeOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsNewScopeOpen(false)}
        >
          <div
            className="modal modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Nueva versión de alcance</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsNewScopeOpen(false)}
              >
                ×
              </button>
            </div>

            <form
              className="modal-body scope-form"
              onSubmit={handleCreateScopeVersion}
            >
              <label>
                Título
                <input
                  type="text"
                  name="title"
                  value={newScopeForm.title}
                  onChange={handleNewScopeChange}
                  required
                />
              </label>

              <label>
                Descripción
                <textarea
                  name="description"
                  rows={3}
                  value={newScopeForm.description}
                  onChange={handleNewScopeChange}
                  required
                />
              </label>

              <label>
                Entregables (un punto por línea)
                <textarea
                  name="deliverables"
                  rows={3}
                  value={newScopeForm.deliverables}
                  onChange={handleNewScopeChange}
                />
              </label>

              <label>
                No incluye / exclusiones
                <textarea
                  name="exclusions"
                  rows={2}
                  value={newScopeForm.exclusions}
                  onChange={handleNewScopeChange}
                />
              </label>

              <div className="scope-form-row">
                <label>
                  Monto (MXN)
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    value={newScopeForm.price}
                    onChange={handleNewScopeChange}
                  />
                </label>

                <label>
                  Fecha límite
                  <input
                    type="date"
                    name="deadline"
                    value={newScopeForm.deadline}
                    onChange={handleNewScopeChange}
                  />
                </label>
              </div>

              <label>
                Límite de revisiones
                <input
                  type="number"
                  min="0"
                  name="revision_limit"
                  value={newScopeForm.revision_limit}
                  onChange={handleNewScopeChange}
                />
              </label>

              <div className="modal-footer modal-footer-right">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setIsNewScopeOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="primary-btn">
                  Guardar versión de alcance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Wrapper de PayPal
function PayPalButtonWrapper({ projectId, onSuccess }) {
  const token = localStorage.getItem("token");

  const createOrder = async () => {
    try {
      const res = await axios.post(
        `${API_BASE}/api/paypal/create-order/${projectId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return res.data.id;
    } catch (err) {
      console.error("Error al crear orden:", err);
    }
  };

  const onApprove = async (data) => {
    try {
      await axios.post(
        `${API_BASE}/api/paypal/capture-order`,
        {
          orderID: data.orderID,
          projectId: projectId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      onSuccess();
    } catch (err) {
      console.error("Error al capturar orden:", err);
    }
  };

  return (
    <PayPalButtons
      createOrder={createOrder}
      onApprove={onApprove}
      style={{ layout: "vertical" }}
    />
  );
}
