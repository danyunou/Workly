import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import FreelancerNavbar from "../../components/FreelancerNavbar";
import "../../styles/serviceForm.css";

export default function CreateService() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    image: null
  });

  const [freelancerCategories, setFreelancerCategories] = useState([]);
  const [error, setError] = useState("");

  const fetchCategories = async () => {
  try {
    const res = await fetch("https://workly-cy4b.onrender.com/api/freelancerProfile/profile", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const text = await res.text();  // obtenemos el contenido completo como texto
    console.log("Respuesta cruda del backend:", text);

    try {
      const data = JSON.parse(text);  // Intentamos parsear manualmente
      if (Array.isArray(data.categories)) {
        setFreelancerCategories(data.categories);
      } else {
        console.warn("No se encontraron categorías válidas en el perfil");
        setFreelancerCategories([]);
      }
    } catch (jsonErr) {
      console.error("Error al parsear JSON:", jsonErr.message);
    }

  } catch (err) {
    console.error("Error de red o fetch:", err);
  }
};

  useEffect(() => {
  if (token) {
    fetchCategories();
  }
}, [token]);

  
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image") {
      setFormData({ ...formData, image: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.image) {
      return setError("Por favor, sube una imagen.");
    }

    const body = new FormData();
    body.append("title", formData.title);
    body.append("description", formData.description);
    body.append("price", formData.price);
    body.append("category", formData.category);
    body.append("image", formData.image);

    try {
      const res = await fetch("https://workly-cy4b.onrender.com/api/services", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al crear el servicio");
      }

      navigate("/FreelancerDashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
    <FreelancerNavbar />
    <div className="service-form-container">
      <h2>Crear nuevo servicio</h2>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <input
          type="text"
          name="title"
          placeholder="Título del servicio"
          value={formData.title}
          onChange={handleChange}
          required
        />

        <textarea
          name="description"
          placeholder="Descripción detallada del servicio"
          value={formData.description}
          onChange={handleChange}
          required
        />

        <input
          type="number"
          name="price"
          placeholder="Precio (USD)"
          value={formData.price}
          onChange={handleChange}
          required
          min={1}
        />

        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
        >
          <option value="">Selecciona una categoría</option>
          {freelancerCategories.map((cat, idx) => (
            <option key={idx} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <input
          type="file"
          name="image"
          accept="image/*"
          onChange={handleChange}
          required
        />

        {error && <p className="error">{error}</p>}

        <button type="submit">Publicar servicio</button>
      </form>
    </div>
    </>
  );
}
