import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "../styles/projectDetail.css";
import { jwtDecode } from "jwt-decode";
import { PayPalButtons } from "@paypal/react-paypal-js";

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

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      const decoded = jwtDecode(token);
      setRoleId(decoded.role_id);
    }

    fetchProject();
  }, [projectId]);

  const fetchProject = () => {
    const token = localStorage.getItem("token");
    axios.get(`http://localhost:5000/api/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => setProject(res.data))
      .catch(err => console.error("Error al obtener detalle del proyecto:", err));
  };

const fetchDispute = async () => {
  const token = localStorage.getItem("token");
  try {
    const res = await axios.get(`http://localhost:5000/api/disputes/by-project/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setDispute(res.data); // ✅ ACTUALIZA dispute correctamente
  } catch (error) {
    console.error("Error al obtener disputa:", error);
    setDispute(null); // por si no hay
  }
};

useEffect(() => {
  if (dispute) {
    fetch(`http://localhost:5000/api/disputes/${dispute.id}/logs`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(res => res.json())
      .then(data => setDisputeLogs(data))
      .catch(err => console.error("Error al cargar logs de disputa:", err));
  }
}, [dispute]);


  const handleAccept = () => {
    const token = localStorage.getItem("token");
    axios.post(`http://localhost:5000/api/projects/${projectId}/accept`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => fetchProject())
      .catch(err => console.error("Error al aceptar contrato:", err));
  };

  const handleUpload = async (e, deliverableId = null) => {
        e.preventDefault();
        const uploadFile = deliverableId ? reuploadFiles[deliverableId] : file;
        if (!uploadFile) return;

        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("deliverable", uploadFile);
        formData.append("projectId", projectId);
        if (deliverableId) formData.append("deliverableId", deliverableId);

        try {
            await axios.post("http://localhost:5000/api/projects/upload-deliverable", formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data",
            },
            });

            alert("Archivo enviado correctamente");
            fetchDeliverables();
            if (!deliverableId) setFile(null);
            else setReuploadFiles(prev => ({ ...prev, [deliverableId]: null }));
        } catch (error) {
            console.error("Error al subir entregable:", error);
            alert("Error al subir el entregable");
        }
    };


  const fetchDeliverables = async () => {
        const token = localStorage.getItem("token");
        try {
            const res = await axios.get(`http://localhost:5000/api/projects/${projectId}/deliverables`, {
            headers: { Authorization: `Bearer ${token}` },
            });
            setDeliverables(res.data);
        } catch (err) {
            console.error("Error al obtener entregables:", err);
        }
    };

    const approveDeliverable = async (deliverableId) => {
        const token = localStorage.getItem("token");
        try {
            await axios.post(
            `http://localhost:5000/api/projects/deliverables/${deliverableId}/approve`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchDeliverables(); // recargar lista
        } catch (err) {
            console.error("Error al aprobar entregable:", err);
        }
    };

    const rejectDeliverable = async (deliverableId) => {
        const reason = prompt("¿Por qué estás rechazando este entregable?");
        if (!reason) return;

        const token = localStorage.getItem("token");
        try {
            await axios.post(
            `http://localhost:5000/api/projects/deliverables/${deliverableId}/reject`,
            { reason },
            { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchDeliverables();
        } catch (err) {
            console.error("Error al rechazar entregable:", err);
        }
    };

    const approveProject = async () => {
        const token = localStorage.getItem("token");
        try {
            await axios.post(
            `http://localhost:5000/api/projects/${projectId}/approve`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchProject(); // refrescar
        } catch (err) {
            console.error("Error al aprobar proyecto:", err);
    }
    };

const submitDispute = async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("token");
  const reasonText = disputeReason.trim();

  // Si ya existe una disputa abierta, no permitir otra
  if (dispute && dispute.status === "pendiente") {
    alert("Ya tienes una disputa abierta. Espera a que sea resuelta.");
    return;
  }

  // Validación general
  if (!reasonText || !policyAccepted) {
    alert("Debes describir el motivo de la disputa y aceptar la política.");
    return;
  }

  try {
    // Enviar nueva disputa (incluso si la anterior fue rechazada)
    await axios.post("http://localhost:5000/api/disputes", {
      projectId,
      description: reasonText,
      policyAccepted
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    alert("Disputa enviada correctamente.");
    setDisputeReason("");
    setPolicyAccepted(false);
    await fetchDispute(); // actualiza estado
  } catch (error) {
    console.error("Error al enviar disputa:", error);
    const message = error.response?.data?.error || "No se pudo enviar la disputa.";
    alert(message);
  }
};


  useEffect(() => {
    if (project) {
        console.log("Datos del proyecto:", project);
        fetchDeliverables();
    }
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
  } = project;

  return (
    <div className="project-detail">
      <h2>Contrato de Prestación de Servicios Freelancer</h2>

      <p><strong>Fecha de Contrato:</strong> {started_at ? new Date(started_at).toLocaleDateString() : "Por confirmar"}</p>
      <p><strong>Freelancer:</strong> {freelancer_name}</p>
      <p><strong>Cliente:</strong> {client_name}</p>
      <p><strong>Proyecto:</strong> {service_title}</p>
      <p><strong>Monto del Contrato:</strong> ${amount}</p>
      <p><strong>Servicios Contratados:</strong> {description}</p>

      <hr />

      <h3>Cláusulas destacadas</h3>
      <ul>
        <li><strong>Objeto del Contrato:</strong> El Freelancer se compromete a proporcionar los servicios acordados en el plazo establecido.</li>
        <li><strong>Pagos y Retenciones:</strong> El monto se retendrá en escrow y será liberado una vez aprobado el trabajo.</li>
        <li><strong>Entrega del Trabajo:</strong> El Freelancer debe subir el entregable antes de la fecha límite.</li>
        <li><strong>Propiedad Intelectual:</strong> El Cliente obtendrá los derechos una vez realizado el pago.</li>
        <li><strong>Resolución de Disputas:</strong> Se aplican criterios automatizados si hay conflicto.</li>
      </ul>

      <div className="actions">
        {/* Aceptar contrato: solo si aún no ha aceptado */}
        {roleId === 1 && !client_accepted && (
          <button onClick={handleAccept} disabled={status !== "pending_contract"}>
            Aceptar contrato (Cliente)
          </button>
        )}
        {roleId === 2 && !freelancer_accepted && (
          <button onClick={handleAccept} disabled={status !== "pending_contract"}>
            Aceptar contrato (Freelancer)
          </button>
        )}

        {/* Solo cliente puede pagar y solo si ambos han aceptado */}
        {roleId === 1 && client_accepted && freelancer_accepted && status === "pending_contract" && (
            <div style={{ maxWidth: "300px", marginTop: "1rem" }}>
                <PayPalButtonWrapper projectId={projectId} onSuccess={fetchProject} />
            </div>
        )}


        {/* Solo freelancer puede subir entregable */}
        {roleId === 2 && status === "in_progress" && (
            <form onSubmit={handleUpload} className="upload-form">
                <input type="file" onChange={(e) => setFile(e.target.files[0])} required />
                <button type="submit">Subir entregable</button>
            </form>
        )}

        {["in_progress", "completed"].includes(status) && deliverables.length > 0 && (
            <div className="deliverables">
                <h3>Entregables del Freelancer</h3>
                <ul>
                {deliverables.map((d, index) => (
                    <li key={d.id}>
                        <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                        Ver archivo {index + 1}
                        </a>{" "}
                        <span>– Subido el {new Date(d.uploaded_at).toLocaleString()}</span>
                        {d.approved_by_client && (
                        <span style={{ marginLeft: "1rem", color: "green" }}>✅ Aprobado</span>
                        )}

                        {roleId === 1 && !d.approved_by_client && !d.rejected_by_client && (
                        <>
                            <button onClick={() => approveDeliverable(d.id)}>Aprobar</button>
                            <button onClick={() => rejectDeliverable(d.id)} style={{ marginLeft: "1rem" }}>
                            Rechazar
                            </button>
                        </>
                        )}

                        {d.rejected_by_client && (
                        <div style={{ color: "red", marginTop: "0.5rem" }}>
                            ❌ Rechazado por el cliente: {d.rejection_message}
                        </div>
                        )}

                        {roleId === 2 && d.rejected_by_client && (
                        <form onSubmit={(e) => handleUpload(e, d.id)} className="upload-form">
                            <input
                            type="file"
                            onChange={(e) =>
                                setReuploadFiles((prev) => ({
                                ...prev,
                                [d.id]: e.target.files[0],
                                }))
                            }
                            required
                            />
                            <button type="submit">Reenviar entregable</button>
                        </form>
                        )}
                    </li>
                ))}

                </ul>
            </div>
        )}

        {roleId === 1 && status === "in_progress" && deliverables.length > 0 &&
            deliverables.every(d => d.approved_by_client) && (
                <button onClick={approveProject} style={{ marginTop: "1rem" }}>
                Aprobar proyecto
                </button>
        )}

        {/* Mostrar formulario de disputa si el proyecto está completado */}
        {roleId === 1 && status === "completed" && (
            <div className="dispute-section" style={{ marginTop: "2rem" }}>
                <h3>Proyecto finalizado</h3>

                {dispute && dispute.status === "open" && (
                <p style={{ color: "orange" }}>
                    Ya tienes una disputa abierta. El administrador está revisándola.
                </p>
                )}

{dispute && dispute.status === "rejected" && !showResubmitForm && (
  <div>
    <p style={{ color: "red" }}>Tu disputa fue rechazada: {dispute.admin_message}</p>
    <button onClick={() => setShowResubmitForm(true)}>Volver a enviar disputa</button>
  </div>
)}

{(showResubmitForm || !dispute) && (
  <form onSubmit={submitDispute}>
    <textarea
      placeholder="Describe el motivo de la disputa"
      value={disputeReason}
      onChange={(e) => setDisputeReason(e.target.value)}
      required
      rows={4}
      style={{ width: "100%", marginBottom: "1rem" }}
    />
    <label>
      <input
        type="checkbox"
        checked={policyAccepted}
        onChange={(e) => setPolicyAccepted(e.target.checked)}
        required
      />
      Acepto la política de resolución de disputas.
    </label>
    <br />
    <button type="submit" disabled={!policyAccepted}>
      {dispute ? "Reenviar disputa" : "Abrir disputa"}
    </button>
  </form>
)}

            </div>
        )}

        {disputeLogs.length > 0 && (
            <div className="dispute-log">
                <p><strong>Última decisión:</strong> {disputeLogs[0].action_description}</p>
                <p><em>{new Date(disputeLogs[0].timestamp).toLocaleString()}</em></p>
            </div>
        )}



      </div>
      
    </div>
  );
}


function PayPalButtonWrapper({ projectId, onSuccess }) {
  const token = localStorage.getItem("token");

  const createOrder = async () => {
    try {
      const res = await axios.post(
        `http://localhost:5000/api/paypal/create-order/${projectId}`,
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
        `http://localhost:5000/api/paypal/capture-order`,
        {
          orderID: data.orderID,
          projectId: projectId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      onSuccess(); // recarga el estado del proyecto
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
