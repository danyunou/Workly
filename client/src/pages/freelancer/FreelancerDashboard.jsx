import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FreelancerNavbar from "../../components/FreelancerNavbar";
import "../../styles/freelancerDashboard.css";

export default function FreelancerDashboard() {
  const [requests, setRequests] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/requests/by-freelancer", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });
        if (!res.ok) throw new Error("Error al obtener solicitudes");
        const data = await res.json();
        setRequests(data);
      } catch (err) {
        console.error("Error al cargar solicitudes:", err.message);
      }
    };

    fetchRequests();
  }, []);

  const handlePropose = (requestId) => {
    navigate(`/requests/${requestId}/propose`);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  return (
    <>
      <FreelancerNavbar />
      <div className="dashboard-container">
        <h2 className="dashboard-title">Solicitudes que podrían interesarte</h2>

        {requests.length === 0 ? (
          <p className="no-requests">No hay solicitudes disponibles por ahora.</p>
        ) : (
          <div className="requests-grid">
            {requests.map((req) => (
              <div className="request-card" key={req.id}>
                <span className="request-category">{req.category}</span>
                <h3 className="request-title">{req.title}</h3>
                <p className="request-description">{req.description.slice(0, 100)}...</p>
                <p className="request-budget">Presupuesto: ${req.budget} USD</p>
                <p className="request-deadline">Fecha límite: {formatDate(req.deadline)}</p>
                <button onClick={() => handlePropose(req.id)}>Enviar propuesta</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
