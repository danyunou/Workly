import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import "../styles/HireService.css";

export default function HireService() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`https://workly-cy4b.onrender.com/api/services/${id}`)
      .then((res) => setService(res.data))
      .catch((err) => console.error("Error al cargar el servicio:", err));
  }, [id]);

  const handleHire = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `https://workly-cy4b.onrender.com/api/services/hire/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Servicio contratado con éxito. Redirigiendo al proyecto...");
      navigate("/my-projects");
    } catch (err) {
      console.error("Error al contratar:", err);
      alert("Hubo un error al contratar el servicio.");
    }
  };

  const handleBackToHome = () => {
    navigate("/home");
  };

  if (!service) return <p className="loading">Cargando...</p>;

  return (
    <>
      <Navbar />
      <div className="hire-container">
        <div className="hire-card">
          <h2 className="hire-title">{service.title}</h2>
          <img
            src={service.image_url}
            alt={service.title}
            className="hire-image"
          />
          <div className="hire-info">
            <p><strong>Descripción:</strong> {service.description}</p>
            <p><strong>Categoría:</strong> {service.category}</p>
            <p><strong>Precio:</strong> ${service.price} USD</p>
            <button className="hire-button" onClick={handleHire}>
              Confirmar contratación
            </button>
            <button className="back-button" onClick={handleBackToHome}>
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
