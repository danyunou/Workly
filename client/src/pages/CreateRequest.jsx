import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import "../styles/createRequest.css";

export default function CreateRequest() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    budget: "",
    deadline: "",
    category: ""
  });

  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");

  // Lista fija de categorías disponibles
  useEffect(() => {
    setCategories([
        "Artes gráficas y diseño", "Marketing", "Escritura y traduccion", "Video y animacion", "Musica y audio", 
        "Programacion y tencología", "Negocios", "Estilo de vida", "Datos", "Fotografía"
    ]);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/requests/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Error al crear la solicitud");
      }

      navigate("/home"); // 👈 Redirige al dashboard de cliente
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <Navbar />
      <div className="create-request-container">
        <h2>Crear nueva solicitud</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="title"
            placeholder="Título del proyecto"
            value={form.title}
            onChange={handleChange}
            required
          />

          <textarea
            name="description"
            placeholder="Descripción detallada"
            value={form.description}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            name="budget"
            placeholder="Presupuesto (USD)"
            value={form.budget}
            onChange={handleChange}
            required
            min={1}
          />

          <input
            type="date"
            name="deadline"
            value={form.deadline}
            onChange={handleChange}
            required
          />

          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            required
          >
            <option value="">Selecciona una categoría</option>
            {categories.map((cat, i) => (
              <option key={i} value={cat}>{cat}</option>
            ))}
          </select>

          {error && <p className="error">{error}</p>}

          <button type="submit">Publicar solicitud</button>
        </form>
      </div>
    </>
  );
}
