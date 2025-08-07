// src/pages/ProposeForm.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import "../../styles/ProposalForm.css";
import FreelancerNavbar from "../../components/FreelancerNavbar";

const ProposeForm = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:5000/api/proposals/send/${requestId}`,
        {
          message,
          proposed_price: price,
          proposed_deadline: deadline
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      alert("¡Propuesta enviada con éxito!");
      navigate("/FreelancerDashboard");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Error al enviar la propuesta.");
    }
  };

  return (
    <>
        <FreelancerNavbar />
    <div className="proposal-form-container">
      <h2>Enviar Propuesta</h2>
      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleSubmit} className="proposal-form">
        <textarea
          placeholder="Mensaje para el cliente"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Precio propuesto"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <input
          type="date"
          placeholder="Fecha límite propuesta"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          required
        />
        <button type="submit">Enviar Propuesta</button>
      </form>
    </div>
    </>
  );
};

export default ProposeForm;
