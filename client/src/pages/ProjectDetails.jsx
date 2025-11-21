// pages/ProjectDetails.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "../styles/projectDetail.css";
import { jwtDecode } from "jwt-decode";
import { PayPalButtons } from "@paypal/react-paypal-js";
import Navbar from "../components/Navbar";
import FreelancerNavbar from "../components/FreelancerNavbar";

export default function ProjectDetail() {
  const { id: projectId } = useParams();
  const [project, setProject] = useState(null);
  const [roleId, setRoleId] = useState(null);

  const [file, setFile] = useState(null);
  const [deliverables, setDeliverables] = useState([]);
  const [reuploadFiles, setReuploadFiles] = useState({});

  const [disputeReason, setDisputeReason] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [dispute, setDispute] = useState(null);
  const [disputeLogs, setDisputeLogs] = useState([]);
  const [showResubmitForm, setShowResubmitForm] = useState(false);
  const [disputeLimitReached, setDisputeLimitReached] = useState(false);

  // Edición de contrato
  const [showEditContract, setShowEditContract] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editDeadline, setEditDeadline] = useState("");

  const isClient = roleId === 1;
  const isFreelancer = roleId === 2;

  // === Helpers ===
  const getToken = () => localStorage.getItem("token");

  const formatDate = (value) => {
    if (!value) return "Por confirmar";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Por confirmar";
    return d.toLocaleDateString();
  };

  const canEditContract = (project) => {
    if (!project) return false;
    const blockedStatuses = ["in_progress", "in_revision", "completed", "cancelled"];
    return !blockedStatuses.includes(project.status);
  };

  // === Carga inicial ===
  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setRoleId(decoded.role_id);
      } catch (e) {
        console.error("Error al decodificar token:", e);
      }
    }
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const fetchProject = () => {
    const token = getToken();
    axios
      .get(`https://workly-cy4b.onrender.com/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setProject(res.data))
      .catch((err) =>
        console.error("Error al obtener detalle del proyecto:", err)
      );
  };

  // === Disputas ===
  const fetchDispute = async () => {
    const token = getToken();
    try {
      const response = await axios.get(
        `https://workly-cy4b.onrender.com/api/disputes/by-project/${projectId}`,
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
        `https://workly-cy4b.onrender.com/api/disputes/${dispute.id}/logs`,
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

  // === Aceptar contrato ===
  const handleAccept = () => {
    const token = getToken();
    axios
      .post(
        `https://workly-cy4b.onrender.com/api/projects/${projectId}/accept`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then(() => fetchProject())
      .catch((err) => console.error("Error al aceptar contrato:", err));
  };

  // === Editar contrato ===
  const openEditContract = () => {
    if (!project) return;
    setEditAmount(project.amount || project.contract_price || "");
    // deadline viene en project.deadline (según tu controller)
    if (project.deadline) {
      // formatear a yyyy-mm-dd para <input type="date">
      const d = new Date(project.deadline);
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
        `https://workly-cy4b.onrender.com/api/projects/${projectId}/contract`,
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

  // === Entregables ===
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
      await axios.post(
        "https://workly-cy4b.onrender.com/api/projects/upload-deliverable",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert("Archivo enviado correctamente");
      fetchDeliverables();
      if (!deliverableId) setFile(null);
      else
        setReuploadFiles((prev) => ({
          ...prev,
          [deliverableId]: null,
        }));
    } catch (error) {
      console.error("Error al subir entregable:", error);
      alert("Error al subir el entregable");
    }
  };

  const fetchDeliverables = async () => {
    const token = getToken();
    try {
      const res = await axios.get(
        `https://workly-cy4b.onrender.com/api/projects/${projectId}/deliverables`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDeliverables(res.data);
    } catch (err) {
      console.error("Error al obtener entregables:", err);
    }
  };

  const approveDeliverable = async (deliverableId) => {
    const token = getToken();
    try {
      await axios.post(
        `https://workly-cy4b.onrender.com/api/projects/deliverables/${deliverableId}/approve`,
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
        `https://workly-cy4b.onrender.com/api/projects/deliverables/${deliverableId}/reject`,
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
        `https://workly-cy4b.onrender.com/api/projects/${projectId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchProject();
    } catch (err) {
      console.error("Error al aprobar proyecto:", err);
    }
  };

  // === Disputa ===
  const submitDispute = async (e) => {
    e.preventDefault();

    const token = getToken();
    const reasonText = disputeReason.trim();

    if (dispute && dispute.status === "pendiente") {
      alert("Ya tienes una disputa abierta. Espera a que sea resuelta.");
      return;
    }

    if (!reasonText || !policyAccepted) {
      alert(
        "Debes describir el motivo de la disputa y aceptar la política."
      );
      return;
    }

    try {
      await axios.post(
        "https://workly-cy4b.onrender.com/api/disputes",
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

  // Cargar entregables cuando ya hay proyecto
  useEffect(() => {
    if (project) {
      fetchDeliverables();
      fetchDispute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  if (!project) return <p>Cargando proyecto...</p>;

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
  } = project;

  const lastLog =
    disputeLogs.length > 0
      ? disputeLogs[disputeLogs.length - 1]
      : null;

  const bothAccepted = client_accepted && freelancer_accepted;

  const showAcceptButton =
    (status === "awaiting_contract" || status === "pending_contract") &&
    ((isClient && !client_accepted) || (isFreelancer && !freelancer_accepted));

  const showPayPal =
    isClient &&
    bothAccepted &&
    (status === "awaiting_payment" ||
      status === "pending_contract"); // compatibilidad

  return (
    <>
      {isFreelancer ? <FreelancerNavbar /> : <Navbar />}

      <div className="project-detail">
        <h2>Contrato de Prestación de Servicios Freelancer</h2>

        <div className="project-info-block">
          <p>
            <strong>Fecha de Contrato:</strong>{" "}
            {started_at ? formatDate(started_at) : "Por confirmar"}
          </p>
          <p>
            <strong>Freelancer:</strong> {freelancer_name}
          </p>
          <p>
            <strong>Cliente:</strong> {client_name}
          </p>
          <p>
            <strong>Proyecto:</strong> {service_title}
          </p>
          <p>
            <strong>Monto del Contrato:</strong>{" "}
            {amount ? `$${Number(amount).toFixed(2)}` : "Por definir"}
          </p>
          <p>
            <strong>Fecha límite:</strong> {formatDate(deadline)}
          </p>
          <p>
            <strong>Servicios Contratados:</strong> {description}
          </p>
        </div>

        <hr />
        <h3>Cláusulas destacadas</h3>
        <ul>
          <li>
            <strong>Objeto del Contrato:</strong> El Freelancer se compromete a
            proporcionar los servicios acordados en el plazo establecido.
          </li>
          <li>
            <strong>Pagos y Retenciones:</strong> El monto se retendrá en
            escrow y será liberado una vez aprobado el trabajo.
          </li>
          <li>
            <strong>Entrega del Trabajo:</strong> El Freelancer debe subir el
            entregable antes de la fecha límite.
          </li>
          <li>
            <strong>Propiedad Intelectual:</strong> El Cliente obtendrá los
            derechos una vez realizado el pago.
          </li>
          <li>
            <strong>Resolución de Disputas:</strong> Se aplican criterios
            automatizados si hay conflicto.
          </li>
        </ul>

        {/* ACCIONES DE CONTRATO / PAGO */}
        <div className="contract-actions">
          {showAcceptButton && (
            <button
              onClick={handleAccept}
              className="primary-btn"
              disabled={
                !["awaiting_contract", "pending_contract"].includes(status)
              }
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
        </div>

        {/* FORMULARIO DE EDICIÓN DE CONTRATO */}
        {showEditContract && (
          <form
            onSubmit={handleUpdateContract}
            className="edit-contract-form"
          >
            <h3>Editar contrato</h3>
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
            <div className="form-actions">
              <button type="submit" className="primary-btn">
                Guardar cambios
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={() => setShowEditContract(false)}
              >
                Cancelar
              </button>
            </div>
            <p className="form-helper">
              Al modificar el contrato, las aceptaciones de cliente y
              freelancer se reiniciarán y deberán aprobarlo nuevamente.
            </p>
          </form>
        )}

        {/* PAGO PAYPAL */}
        {showPayPal && (
          <div className="paypal-block">
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
          </div>
        )}

        {/* SUBIDA DE ENTREGABLES (FREELANCER) */}
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

        {/* LISTA DE ENTREGABLES */}
        {["in_progress", "completed"].includes(status) &&
          deliverables.length > 0 && (
            <div className="deliverables">
              <h3>Archivos entregables</h3>
              <ul>
                {deliverables.map((d, index) => (
                  <li key={d.id} className="deliverable-item">
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      📄 Ver archivo {index + 1}
                    </a>
                    <span>
                      {" "}
                      – Subido el{" "}
                      {new Date(d.uploaded_at).toLocaleString()}
                    </span>
                    {d.approved_by_client && (
                      <span
                        style={{ marginLeft: "1rem", color: "green" }}
                      >
                        ✅ Aprobado
                      </span>
                    )}

                    {isClient &&
                      !d.approved_by_client &&
                      !d.rejected_by_client && (
                        <>
                          <button
                            onClick={() => approveDeliverable(d.id)}
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => rejectDeliverable(d.id)}
                            style={{ marginLeft: "1rem" }}
                          >
                            Rechazar
                          </button>
                        </>
                      )}

                    {d.rejected_by_client && (
                      <div
                        style={{
                          color: "red",
                          marginTop: "0.5rem",
                        }}
                      >
                        ❌ Rechazado por el cliente:{" "}
                        {d.rejection_message}
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

        {/* BOTÓN APROBAR PROYECTO (CLIENTE) */}
        {isClient &&
          status === "in_progress" &&
          deliverables.length > 0 &&
          deliverables.every((d) => d.approved_by_client) && (
            <button
              onClick={approveProject}
              style={{ marginTop: "1rem" }}
            >
              ✅ Aprobar proyecto
            </button>
          )}

        {/* DISPUTAS (cliente, cuando completed) */}
        {isClient && status === "completed" && (
          <div
            className="dispute-section"
            style={{ marginTop: "2rem" }}
          >
            <h3>¿Tienes un problema con el proyecto?</h3>
            <p>
              Puedes abrir una disputa si consideras que el entregable no
              cumple con lo acordado.
            </p>
            <p
              style={{ fontSize: "0.9rem", color: "#555" }}
            >
              Al enviar una disputa, se notificará a los
              administradores para revisar el caso. <br />
              Lee nuestra{" "}
              <a
                href="/dispute-terms"
                target="_blank"
                rel="noreferrer"
              >
                política de resolución de disputas
              </a>
              .
            </p>

            {disputeLimitReached && (
              <p
                style={{
                  color: "red",
                  fontWeight: "bold",
                }}
              >
                Este proyecto ha alcanzado el límite de disputas
                permitidas (5). Ya no es posible abrir nuevas
                disputas.
              </p>
            )}

            {!disputeLimitReached &&
              dispute &&
              dispute.status === "open" && (
                <p style={{ color: "orange" }}>
                  Ya tienes una disputa abierta. El administrador
                  está revisándola.
                </p>
              )}

            {!disputeLimitReached &&
              dispute &&
              dispute.status === "rejected" &&
              !showResubmitForm && (
                <div>
                  <p style={{ color: "red" }}>
                    Tu disputa fue rechazada: {dispute.admin_message}
                  </p>
                  <button
                    onClick={() => setShowResubmitForm(true)}
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
                <form onSubmit={submitDispute}>
                  <textarea
                    placeholder="Describe el motivo de la disputa"
                    value={disputeReason}
                    onChange={(e) =>
                      setDisputeReason(e.target.value)
                    }
                    required
                    rows={4}
                    style={{ width: "100%", marginBottom: "1rem" }}
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={policyAccepted}
                      onChange={(e) =>
                        setPolicyAccepted(e.target.checked)
                      }
                      required
                    />{" "}
                    Acepto la política de resolución de disputas.
                  </label>
                  <br />
                  <button
                    type="submit"
                    disabled={!policyAccepted}
                  >
                    {dispute ? "Reenviar disputa" : "Abrir disputa"}
                  </button>
                </form>
              )}
          </div>
        )}

        {lastLog && (
          <div
            className="dispute-log"
            style={{
              marginTop: "1.5rem",
              background: "#f9f9f9",
              padding: "1rem",
              borderRadius: "6px",
            }}
          >
            <strong>Última decisión del administrador:</strong>
            <p>{lastLog.action_description}</p>
            <p
              style={{ fontSize: "0.85rem", color: "#666" }}
            >
              {new Date(lastLog.timestamp).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// Wrapper de PayPal
function PayPalButtonWrapper({ projectId, onSuccess }) {
  const token = localStorage.getItem("token");

  const createOrder = async () => {
    try {
      const res = await axios.post(
        `https://workly-cy4b.onrender.com/api/paypal/create-order/${projectId}`,
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
        `https://workly-cy4b.onrender.com/api/paypal/capture-order`,
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
