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
    fetch("https://workly-cy4b.onrender.com/api/users/profile", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(res => res.json())
      .then(data => {
        const initialData = {
          biography: data.biography || "",
          usage_preference: data.usage_preference || "",
          communication_pref: data.communication_hours || "",
          profile_picture: null,
          selectedDays: [],
          horaInicio: 9,
          horaFin: 18,
        };
        setForm(initialData);
        setOriginalForm(initialData);
      })
      .catch(() => {
        setMessage("Error al cargar el perfil.");
        setMessageType("error");
      });
  }, []);

  useEffect(() => {
    if (!form) return;

    const { selectedDays, horaInicio, horaFin } = form;

    if (selectedDays.length > 0 && horaInicio && horaFin) {
      const dias = selectedDays.join(", ");
      const texto = `${dias}, ${horaInicio}h - ${horaFin}h`;
      setForm((prev) => ({ ...prev, communication_pref: texto }));
    }
  }, [form?.selectedDays, form?.horaInicio, form?.horaFin]);

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
      const res = await fetch("https://workly-cy4b.onrender.com/api/users/profile", {
        method: "PUT",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const result = await res.json();
      if (res.ok) {
        const updatedForm = { ...form };
        delete updatedForm.profile_picture;
        setOriginalForm(updatedForm);

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

      <select
        value={form.usage_preference}
        onChange={(e) => setForm({ ...form, usage_preference: e.target.value })}
      >
        <option value="">Selecciona un uso</option>
        <option value="Negocio Principal">Negocio principal</option>
        <option value="Trabajo secundario">Trabajo secundario</option>
        <option value="Uso personal">Uso personal</option>
      </select>

      <div className="day-buttons">
        {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((day) => (
          <button
            type="button"
            key={day}
            className={form.selectedDays.includes(day) ? "selected" : ""}
            onClick={() =>
              setForm((prev) => {
                const updated = prev.selectedDays.includes(day)
                  ? prev.selectedDays.filter(d => d !== day)
                  : [...prev.selectedDays, day];
                return { ...prev, selectedDays: updated };
              })
            }
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="time-range-container">
        <label>Desde: {form.horaInicio}:00</label>
        <input
          type="range"
          min="0"
          max="23"
          value={form.horaInicio}
          onChange={(e) => setForm({ ...form, horaInicio: parseInt(e.target.value) })}
        />

        <label>Hasta: {form.horaFin}:00</label>
        <input
          type="range"
          min="1"
          max="24"
          value={form.horaFin}
          onChange={(e) => setForm({ ...form, horaFin: parseInt(e.target.value) })}
        />
      </div>

      {message && (
        <p className={`form-message ${messageType === "error" ? "error" : "success"}`}>
          {message}
        </p>
      )}

      <button onClick={handleSubmit}>Guardar cambios</button>
    </div>
  );
}
