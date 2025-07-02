import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import WelcomeNavbar from "../components/WelcomeNavbar";
import "../styles/register.css";
import eye from "../assets/icons/eye.png";

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
  const navigate = useNavigate();
  const [error, setError] = useState("");
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 3000); // Desaparece después de 3 segundos

      return () => clearTimeout(timer); // Limpieza si el error cambia o el componente se desmonta
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
    if (!form.full_name.trim()) {
      setError("El nombre completo es obligatorio.");
      return;
    }
    if (form.full_name.trim().length < 2) {
      setError("El nombre completo debe tener al menos 2 caracteres.");
      return;
    } 
    
    const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
    if (!nameRegex.test(form.full_name.trim())) {
      setError("El nombre solo puede contener letras y espacios.");
      return;
    }
    if (!form.email.trim()) {
      setError("El correo electrónico es obligatorio.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("Introduce un correo electrónico válido.");
      return;
    }
    if (!form.username.trim()) {
      setError("El nombre de usuario es obligatorio.");
      return;
    }
    if (form.username.trim().length < 2) {
      setError("El usuario debe tener al menos 5 caracteres.");
      return;
    }
    const usernameRegex = /^[A-Za-z0-9_]+$/;
    if (!usernameRegex.test(form.username.trim())) {
      setError("El nombre de usuario solo puede contener letras, números y guiones bajos.");
      return;
    }
    if (!form.password.trim()) {
      setError("La contraseña es obligatoria.");
      return;
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[+*.\-_/#$%!]).{8,}$/;
    if (!passwordRegex.test(form.password)) {
      setError("La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo especial (+*.-_/#$%!).");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    // Si todo es válido
    setError("");
    setStep(2);
  };


  const handleSubmit = async () => {
    if (!form.usage_preference) {
      setError("Selecciona cómo planeas usar Workly.");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/auth/register", form);
      if (res.data.success) {
        setError("Registro exitoso. Revisa tu correo para verificar tu cuenta.");
        navigate("/login");
      } else if (res.data.error) {
        setError(res.data.error);
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo registrar el usuario.");
    }
  };
  

  return (
    <>
      <WelcomeNavbar />
      <div className="register-container">
        <h2>Crear cuenta</h2>

        {/* Mostrar error SIEMPRE que exista, no importa el paso */}
        {error && <p className="error-message">{error}</p>}

        {step === 1 && (
          <>
            <input
              placeholder="Nombre completo"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
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
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                className="toggle-password"
                onMouseDown={() => setShowPassword(true)}
                onMouseUp={() => setShowPassword(false)}
                onMouseLeave={() => setShowPassword(false)}
              >
                <img src={eye} alt="Mostrar contraseña" className="toggle-password-icon" />
              </button>
            </div>

            <button type="button" onClick={handleNext}>Siguiente</button>
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
                    className={`preference-card ${form.usage_preference === opt.value ? "selected" : ""}`}
                    onClick={() => setForm({ ...form, usage_preference: opt.value })}
                  >
                    <strong>{opt.label}</strong>
                    <p>{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="register-buttons">
              <button onClick={() => setStep(1)} className="back-button">Atrás</button>
              <button onClick={handleSubmit}>Registrarse</button>
            </div>

          </>
        )}
      </div>
    </>
  );
}
