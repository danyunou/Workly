// src/pages/Register.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import WelcomeNavbar from "../components/WelcomeNavbar";
import "../styles/register.css";
import openEye from "../assets/icons/open-eye.png";
import closedEye from "../assets/icons/closed-eye.png";

export default function Register() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    username: "",
    password: "",
    usage_preference: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // 👈 para bloquear el botón
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const opciones = [
    {
      value: "negocio_principal",
      label: "Mi negocio o trabajo principal",
      desc: "Un proyecto para tu empresa o trabajo principal.",
    },
    {
      value: "secundario",
      label: "Una necesidad empresarial secundaria",
      desc: "Un trabajo adicional a tu empleo actual.",
    },
    {
      value: "personal",
      label: "Uso personal",
      desc: "Servicios para desarrollo personal o recreación.",
    },
  ];

  const isStepOneComplete = () => {
    return (
      form.full_name.trim() &&
      form.email.trim() &&
      form.username.trim() &&
      form.password.trim()
    );
  };

  const handleNext = () => {
    // Limpia el error previo
    setError("");

    const full_name = form.full_name.trim();
    const email = form.email.trim();
    const username = form.username.trim();
    const password = form.password;

    // Nombre completo
    if (!full_name) {
      setError("El nombre completo es obligatorio.");
      return;
    }
    if (full_name.length < 2) {
      setError("El nombre completo debe tener al menos 2 caracteres.");
      return;
    }
    const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
    if (!nameRegex.test(full_name)) {
      setError("El nombre solo puede contener letras y espacios.");
      return;
    }

    // Correo
    if (!email) {
      setError("El correo electrónico es obligatorio.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Introduce un correo electrónico válido.");
      return;
    }

    // Username
    if (!username) {
      setError("El nombre de usuario es obligatorio.");
      return;
    }
    if (username.length < 5) {
      setError("El usuario debe tener al menos 5 caracteres.");
      return;
    }
    const usernameRegex = /^[A-Za-z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      setError(
        "El nombre de usuario solo puede contener letras, números y guiones bajos."
      );
      return;
    }

    // Password
    if (!password.trim()) {
      setError("La contraseña es obligatoria.");
      return;
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[+*.\-_/#$%!]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError(
        "La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo especial (+*.-_/#$%!)."
      );
      return;
    }

    // Si todo es válido
    setError("");
    setStep(2);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // evita doble click

    if (!form.usage_preference) {
      setError("Selecciona cómo planeas usar Workly.");
      return;
    }

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      username: form.username.trim(),
      password: form.password,
      usage_preference: form.usage_preference,
    };

    try {
      setIsSubmitting(true);

      const res = await axios.post(
        "https://workly-cy4b.onrender.com/api/auth/register",
        payload
      );

      if (res.data.success) {
        setError("Registro exitoso. Revisa tu correo para verificar tu cuenta.");
        navigate("/login");
      } else if (res.data.error) {
        setError(res.data.error);
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo registrar el usuario.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <WelcomeNavbar />
      <div className="register-container">
        <h2>Crea una cuenta con nosotros</h2>

        {error && <p className="error-message">{error}</p>}

        {step === 1 && (
          <>
            <input
              placeholder="Nombre completo"
              value={form.full_name}
              onChange={(e) =>
                setForm({ ...form, full_name: e.target.value })
              }
            />
            <input
              placeholder="Correo electrónico"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              placeholder="Nombre de usuario"
              value={form.username}
              onChange={(e) =>
                setForm({ ...form, username: e.target.value })
              }
            />

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                <img
                  src={showPassword ? openEye : closedEye}
                  alt={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  className="toggle-password-icon"
                />
              </button>
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={!isStepOneComplete()}
            >
              Siguiente
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="preference-section">
              <h4>¿Cómo planeas usar Workly?</h4>
              <div className="preference-options">
                {opciones.map((opt) => (
                  <div
                    key={opt.value}
                    className={`preference-card ${
                      form.usage_preference === opt.value ? "selected" : ""
                    }`}
                    onClick={() =>
                      setForm({ ...form, usage_preference: opt.value })
                    }
                  >
                    <strong>{opt.label}</strong>
                    <p>{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="register-buttons">
              <button onClick={() => setStep(1)} className="back-button">
                Atrás
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Registrando..." : "Registrarse"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
