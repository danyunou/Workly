import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/MyRequests.css";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

const MyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [proposals, setProposals] = useState({});
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await axios.get("https://workly-cy4b.onrender.com/api/requests/by-client", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRequests(res.data);
      } catch (error) {
        console.error("Error fetching requests:", error);
      }
    };
    fetchRequests();
  }, [token]);

  const toggleRequestDetails = async (requestId) => {
    if (expandedRequestId === requestId) {
      setExpandedRequestId(null);
      return;
    }

    try {
      const res = await axios.get(`https://workly-cy4b.onrender.com/api/proposals/by-request/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProposals((prev) => ({ ...prev, [requestId]: res.data }));
      setExpandedRequestId(requestId);
    } catch (error) {
      console.error("Error fetching proposals:", error);
    }
  };

  const handleAcceptProposal = async (proposalId) => {
    try {
      await axios.post(
        `https://workly-cy4b.onrender.com/api/proposals/accept/${proposalId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Propuesta aceptada");
      navigate("/projects"); // Futuro módulo de proyectos
    } catch (error) {
      console.error("Error al aceptar propuesta:", error);
      alert("Hubo un error al aceptar la propuesta.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="my-requests">
        <h2>My Project Requests</h2>
        {requests.length === 0 ? (
          <p>You haven't published any requests yet.</p>
        ) : (
          <ul className="request-list">
            {requests.map((req) => (
              <li key={req.id} className="request-item">
                <h3>{req.title}</h3>
                <p>{req.description}</p>
                <p><strong>Budget:</strong> ${req.budget}</p>
                <p><strong>Deadline:</strong> {new Date(req.deadline).toLocaleDateString()}</p>
                <p><strong>Status:</strong> {req.status}</p>
                <br></br>
                <button onClick={() => toggleRequestDetails(req.id)}>
                  {expandedRequestId === req.id ? "Hide Proposals" : "View Proposals"}
                </button>

                {expandedRequestId === req.id && (
                  <div className="proposal-section">
                    <h4>Proposals ({proposals[req.id]?.length || 0})</h4>
                    {proposals[req.id]?.length > 0 ? (
                      <ul>
                        {proposals[req.id].map((prop) => (
                          <li key={prop.id} className="proposal-item">
                            <p><strong>Freelancer:</strong> {prop.freelancer_name}</p>
                            <p><strong>Mensaje:</strong> {prop.message}</p>
                            <p><strong>Presupuesto:</strong> ${prop.offer_budget}</p>
                            <button onClick={() => handleAcceptProposal(prop.id)}>Aceptar propuesta</button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No hay propuestas aún.</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default MyRequests;
