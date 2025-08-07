import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function HireService() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`http://localhost:5000/api/services/${id}`)
      .then(res => setService(res.data))
      .catch(err => console.error("Error al cargar el servicio:", err));
  }, [id]);

  const handleHire = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`http://localhost:5000/api/services/hire/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Servicio contratado con éxito. Redirigiendo al proyecto...");
      navigate("/my-projects"); // Ajusta si tu ruta es distinta
    } catch (err) {
      console.error("Error al contratar:", err);
      alert("Hubo un error al contratar el servicio.");
    }
  };

  if (!service) return <p>Cargando...</p>;

  return (
    <div className="hire-container">
      <h2>{service.title}</h2>
      <img src={service.image_url} alt={service.title} style={{ width: "300px" }} />
      <p><strong>Descripción:</strong> {service.description}</p>
      <p><strong>Categoría:</strong> {service.category}</p>
      <p><strong>Precio:</strong> ${service.price} USD</p>
      <button onClick={handleHire}>Confirmar contratación</button>
    </div>
  );
}
