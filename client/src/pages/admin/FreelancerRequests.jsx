import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/FreelancerRequests.css";

export default function FreelancerRequests() {
  const [requests, setRequests] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [toast, setToast] = useState("");
  const navigate = useNavigate();

  const fetchRequests = async () => {
    try {
      const res = await fetch("https://workly-cy4b.onrender.com/api/admin/verifications", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar solicitudes:", err.message);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // ✅ Toast temporal
  useEffect(() => {
    if (toast) {
      const timeout = setTimeout(() => setToast(""), 3000);
      return () => clearTimeout(timeout);
    }
  }, [toast]);

  // ✅ Aprobar
  const handleApprove = async (id) => {
    try {
      const res = await fetch(`https://workly-cy4b.onrender.com/api/admin/verifications/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!res.ok) throw new Error();
      setStatusMap(prev => ({ ...prev, [id]: "approved" }));
      setToast("✅ Solicitud aprobada");
    } catch {
      setStatusMap(prev => ({ ...prev, [id]: "error" }));
      setToast("❌ Error al aprobar");
    }
  };

  // ❌ Rechazar con mensaje
  const handleReject = async (id) => {
    const reason = prompt("¿Por qué estás rechazando esta solicitud?");
    if (!reason) return;

    try {
      const res = await fetch(`https://workly-cy4b.onrender.com/api/admin/verifications/${id}/reject`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: reason }), // si decides guardarlo en un log futuro
      });

      if (!res.ok) throw new Error();
      setStatusMap(prev => ({ ...prev, [id]: "rejected" }));
      setToast("📛 Solicitud rechazada");
    } catch {
      setStatusMap(prev => ({ ...prev, [id]: "error" }));
      setToast("❌ Error al rechazar");
    }
  };

  const renderEducation = (education) => {
    if (!education) return null;
    // Si ya viene como string, lo mostramos tal cual
    if (typeof education === "string") {
      return education;
    }
    // Si viene como array de objetos
    if (Array.isArray(education)) {
      return education.map((edu, idx) => (
        <span key={idx}>
          {edu.carrera} - {edu.institucion} ({edu.anio})
          {idx < education.length - 1 && ", "}
        </span>
      ));
    }
    // Si viene como un solo objeto { anio, carrera, institucion }
    return `${education.carrera} - ${education.institucion} (${education.anio})`;
  };


  return (
    <div className="requests-wrapper">
      <h2>Solicitudes de conversión a freelancer</h2>

      {toast && <div className="toast">{toast}</div>}

      <div className="requests-scroll-container">
        {requests.length === 0 ? (
          <p className="no-requests">No hay solicitudes pendientes.</p>
        ) : (
          <div className="requests-list">
            {requests.map((r) => (
            <div key={r.id} className="request-card">
              <h4>{r.full_name} (@{r.username})</h4>
              <p><strong>Correo:</strong> {r.email}</p>
              <p><strong>Subido:</strong> {new Date(r.created_at).toLocaleString()}</p>

              {/* Alias */}
              {r.alias && (
                <p><strong>Alias profesional:</strong> {r.alias}</p>
              )}

              {/* Descripción */}
              {r.description && (
                <p><strong>Descripción:</strong> {r.description}</p>
              )}

              {/* Tags de idiomas / categorías / skills */}
              <div className="tags-row">
                {r.languages && r.languages.length > 0 && (
                  <div>
                    <strong>Idiomas:</strong>
                    <div className="tags">
                      {r.languages.map((lang, idx) => (
                        <span key={idx} className="tag">{lang}</span>
                      ))}
                    </div>
                  </div>
                )}

                {r.categories && r.categories.length > 0 && (
                  <div>
                    <strong>Categorías:</strong>
                    <div className="tags">
                      {r.categories.map((cat, idx) => (
                        <span key={idx} className="tag">{cat}</span>
                      ))}
                    </div>
                  </div>
                )}

                {r.skills && r.skills.length > 0 && (
                  <div>
                    <strong>Skills:</strong>
                    <div className="tags">
                      {r.skills.map((skill, idx) => (
                        <span key={idx} className="tag">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Educación */}
              {r.education && (
                <p>
                  <strong>Educación:</strong>{" "}
                  {renderEducation(r.education)}
                </p>
              )}

              {/* Links */}
{(r.website || (r.social_links && r.social_links.length > 0)) ? (
  <div className="links-row">

    {/* Website */}
    {r.website && (
      <a href={r.website} target="_blank" rel="noreferrer">
        Portafolio / sitio web
      </a>
    )}

    {/* Social links */}
    {Array.isArray(r.social_links) &&
      r.social_links.length > 0 &&
      r.social_links.map((link, idx) => (
        <a key={idx} href={link} target="_blank" rel="noreferrer">
          Red social #{idx + 1}
        </a>
      ))
    }
  </div>
) : (
  <p><strong>Links:</strong> No se proporcionaron enlaces.</p>
)}


              <a href={r.file_url} target="_blank" rel="noreferrer">Ver documento</a>

              {statusMap[r.id] === "approved" && <p className="approved-msg">✅ Aprobado</p>}
              {statusMap[r.id] === "rejected" && <p className="rejected-msg">❌ Rechazado</p>}
              {statusMap[r.id] === "error" && <p className="error-msg">⚠️ Hubo un error</p>}

              {!statusMap[r.id] && (
                <div className="btns">
                  <button className="approve" onClick={() => handleApprove(r.id)}>Aprobar</button>
                  <button className="reject" onClick={() => handleReject(r.id)}>Rechazar</button>
                </div>
              )}
            </div>
          ))}
          </div>
        )}
      </div>

      <button className="back-button" onClick={() => navigate("/admin")}>
        ← Volver al panel de administrador
      </button>
    </div>
  );
}
