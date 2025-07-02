import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/editProfile.css";

export default function EditProfile() {
  const [form, setForm] = useState(null);
  const [originalForm, setOriginalForm] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/api/users/profile", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(res => res.json())
      .then(data => {
        const initialData = {
          biography: data.biography || "",
          usage_preference: data.usage_preference || "",
          communication_pref: data.communication_hours || "",
          profile_picture: null,
        };
        setForm(initialData);
        setOriginalForm(initialData);
      })
      .catch(() => {
        setMessage("Error al cargar el perfil.");
        setMessageType("error");
      });
  }, []);

  const handleSubmit = async () => {
    if (!form || !originalForm) return;

    const formData = new FormData();
    let hasChanges = false;

    if (form.profile_picture) {
      formData.append("profile_picture", form.profile_picture);
      hasChanges = true;
    }

    if (form.biography !== originalForm.biography) {
      formData.append("biography", form.biography);
      hasChanges = true;
    }

    if (form.usage_preference !== originalForm.usage_preference) {
      formData.append("usage_preference", form.usage_preference);
      hasChanges = true;
    }

    if (form.communication_pref !== originalForm.communication_pref) {
      formData.append("communication_pref", form.communication_pref);
      hasChanges = true;
    }

    if (!hasChanges) {
      setMessage("No realizaste cambios.");
      setMessageType("error");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/users/profile", {
        method: "PUT",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const result = await res.json();
      if (res.ok) {
        setMessage("Perfil actualizado correctamente.");
        setMessageType("success");
        setTimeout(() => navigate("/user-profile"), 1500);
      } else {
        setMessage(result.error || "Error al actualizar el perfil.");
        setMessageType("error");
      }
    } catch (err) {
      setMessage("Error de conexión.");
      setMessageType("error");
    }
  };

  if (!form) return <p>Cargando datos del perfil...</p>;

  return (
    <div className="edit-profile-form">
      <h2>Editar Perfil</h2>
      <input
        type="file"
        accept="image/png,image/jpeg"
        onChange={(e) => setForm({ ...form, profile_picture: e.target.files[0] })}
      />
      <textarea
        placeholder="Biografía (50-500 caracteres)"
        value={form.biography}
        onChange={(e) => setForm({ ...form, biography: e.target.value })}
      />
      <select value={form.usage_preference} onChange={(e) => setForm({ ...form, usage_preference: e.target.value })}>
        <option value="">Selecciona un uso</option>
        <option value="Negocio Principal">Negocio principal</option>
        <option value="Trabajo secundario">Trabajo secundario</option>
        <option value="Uso personal">Uso personal</option>
      </select>
      <input
        placeholder="Preferencias de comunicación (ej. Lunes a Viernes, 9am-6pm)"
        value={form.communication_pref}
        onChange={(e) => setForm({ ...form, communication_pref: e.target.value })}
      />

      {message && (
        <p className={`form-message ${messageType === "error" ? "error" : "success"}`}>
          {message}
        </p>
      )}

      <button onClick={handleSubmit}>Guardar cambios</button>
    </div>
  );
}
