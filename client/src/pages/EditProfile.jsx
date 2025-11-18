import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/editProfile.css";
import Navbar from "../components/Navbar";

// 0..23 como en EditFreelancerProfile
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function EditProfile() {
  const [form, setForm] = useState(null);
  const [originalForm, setOriginalForm] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [previewImage, setPreviewImage] = useState("");
  const [allDay, setAllDay] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(
          "https://workly-cy4b.onrender.com/api/users/profile",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const data = await res.json();

        // usage_preference y comunicación pueden venir en preferences o plano
        const usagePref =
          data.preferences?.usage_preference || data.usage_preference || "";

        const ch =
          data.preferences?.communication_hours ||
          data.communication_pref ||
          data.communication_hours ||
          "";

        let selectedDays = [];
        let start = 9;
        let end = 18;

        if (ch) {
          // "Viernes, Jueves, Miércoles, 10:00 - 16:00"
          const timeMatch = ch.match(
            /(\d{1,2}):\d{2}\s*-\s*(\d{1,2}):\d{2}/
          );
          if (timeMatch) {
            start = parseInt(timeMatch[1], 10);
            end = parseInt(timeMatch[2], 10);
          }

          const lastComma = ch.lastIndexOf(",");
          if (lastComma !== -1) {
            const daysStr = ch.slice(0, lastComma);
            selectedDays = daysStr
              .split(",")
              .map((d) => d.trim())
              .filter(Boolean);
          }
        }

        const isAllDay = start === 0 && end === 23;
        setAllDay(isAllDay);

        const profileImageUrl =
          data.profile_picture_url || data.profile_picture || "";

        const initialData = {
          biography: data.biography || data.description || "",
          usage_preference: usagePref,
          communication_pref: ch, // string original
          profile_picture: null, // File nuevo
          selectedDays,
          startHour: start,
          endHour: end,
          profileImageUrl,
        };

        setForm(initialData);
        setOriginalForm(initialData);
        setPreviewImage(profileImageUrl);
      } catch (err) {
        setMessage("Error al cargar el perfil.");
        setMessageType("error");
      }
    };

    fetchProfile();
  }, []);

  const buildCommunicationPref = () => {
    if (!form.selectedDays.length) return "";
    const dias = form.selectedDays.join(", ");
    return `${dias}, ${form.startHour}:00 - ${form.endHour}:00`;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm({ ...form, profile_picture: file });
    const url = URL.createObjectURL(file);
    setPreviewImage(url);
  };

  const handleSubmit = async () => {
    if (!form || !originalForm) return;

    setMessage("");
    setMessageType("success");

    const formData = new FormData();
    let hasChanges = false;

    const newComm = buildCommunicationPref();

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

    if (newComm !== originalForm.communication_pref) {
      formData.append("communication_pref", newComm);
      hasChanges = true;
    }

    if (!hasChanges) {
      setMessage("No realizaste cambios.");
      setMessageType("error");
      return;
    }

    try {
      const res = await fetch(
        "https://workly-cy4b.onrender.com/api/users/profile",
        {
          method: "PUT",
          body: formData,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const result = await res.json();
      if (res.ok) {
        // Actualizamos el original con los nuevos valores
        const updatedOriginal = {
          ...form,
          communication_pref: newComm,
          profile_picture: null,
        };
        setOriginalForm(updatedOriginal);

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

  if (!form) {
    return (
      <>
        <Navbar />
        <main className="edit-profile-page">
          <div className="edit-profile-form">
            <h2>Editar Perfil</h2>
            <p>Cargando datos del perfil...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="edit-profile-page">
        <div className="edit-profile-form">
          <h2>Editar Perfil</h2>

          {/* FOTO con mismo diseño que freelancer */}
          <div className="form-field">
            <label className="field-label">Foto de perfil</label>
            <div className="avatar-section">
              <div className="avatar-wrapper">
                {previewImage ? (
                  <img src={previewImage} alt="Foto de perfil" />
                ) : (
                  <div className="avatar-placeholder">Foto</div>
                )}
              </div>
              <label className="avatar-button">
                Cambiar foto
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  hidden
                  onChange={handleImageChange}
                />
              </label>
            </div>
          </div>

          {/* BIO */}
          <div className="form-field">
            <label className="field-label">Biografía</label>
            <textarea
              placeholder="Biografía (50-500 caracteres)"
              value={form.biography}
              onChange={(e) =>
                setForm({ ...form, biography: e.target.value })
              }
            />
          </div>

          {/* USO */}
          <div className="form-field">
            <label className="field-label">¿Cómo usarás Workly?</label>
            <select
              value={form.usage_preference}
              onChange={(e) =>
                setForm({ ...form, usage_preference: e.target.value })
              }
            >
              <option value="">Selecciona un uso</option>
              <option value="Negocio Principal">Negocio principal</option>
              <option value="Trabajo secundario">Trabajo secundario</option>
              <option value="Uso personal">Uso personal</option>
            </select>
          </div>

          {/* DÍAS */}
          <div className="form-field">
            <label className="field-label">Días de comunicación</label>
            <div className="day-buttons">
              {[
                "Lunes",
                "Martes",
                "Miércoles",
                "Jueves",
                "Viernes",
                "Sábado",
                "Domingo",
              ].map((day) => (
                <button
                  type="button"
                  key={day}
                  className={
                    form.selectedDays.includes(day) ? "selected" : ""
                  }
                  onClick={() =>
                    setForm((prev) => {
                      const updated = prev.selectedDays.includes(day)
                        ? prev.selectedDays.filter((d) => d !== day)
                        : [...prev.selectedDays, day];
                      return { ...prev, selectedDays: updated };
                    })
                  }
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* HORARIO – misma lógica que freelancer */}
          <div className="form-field">
            <label className="field-label">Horario de comunicación</label>
            <div className="hour-row">
              <div className="hour-field">
                <span>De</span>
                <select
                  disabled={allDay}
                  value={form.startHour}
                  onChange={(e) => {
                    const h = parseInt(e.target.value, 10);
                    setForm((prev) => ({
                      ...prev,
                      startHour: h,
                      endHour:
                        prev.endHour <= h ? h + 1 : prev.endHour,
                    }));
                  }}
                >
                  {HOURS.slice(0, 23).map((h) => (
                    <option key={h} value={h}>
                      {h}:00
                    </option>
                  ))}
                </select>
              </div>
              <div className="hour-field">
                <span>a</span>
                <select
                  disabled={allDay}
                  value={form.endHour}
                  onChange={(e) => {
                    const h = parseInt(e.target.value, 10);
                    setForm((prev) => ({
                      ...prev,
                      endHour: h,
                    }));
                  }}
                >
                  {HOURS.filter((h) => h > form.startHour).map((h) => (
                    <option key={h} value={h}>
                      {h}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="all-day-row">
              <input
                type="checkbox"
                id="allDay"
                checked={allDay}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAllDay(checked);
                  setForm((prev) =>
                    checked
                      ? { ...prev, startHour: 0, endHour: 23 }
                      : { ...prev, startHour: 9, endHour: 18 }
                  );
                }}
              />
              <label htmlFor="allDay" className="all-day-label">
                Disponible 24 horas
              </label>
            </div>
          </div>

          {message && (
            <p
              className={`form-message ${
                messageType === "error" ? "error" : "success"
              }`}
            >
              {message}
            </p>
          )}

          <div className="edit-profile-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={handleSubmit}
            >
              Guardar cambios
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate("/user-profile")}
            >
              Volver al perfil
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
