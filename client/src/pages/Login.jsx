import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import "../styles/login.css";
import eye from "../assets/icons/eye.png";
import WelcomeNavbar from "../components/WelcomeNavbar";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    if (!validateEmail(email)) {
      setError("El formato del correo electrónico no es válido.");
      return;
    }

    try {
      const data = await loginUser({ email, password });

      // Mostrar datos del usuario
      console.log("Usuario recibido:", data.user);

      // login recibe tanto el token como el usuario
      login(data.token, data.user);

      // Redirección según el rol
      if (data.user.role_id === 3) {
        navigate("/admin");
      }
      else if (data.user.role_id === 2) {
        navigate("/FreelancerDashboard");
      } else {
        navigate("/home");
      }
    } catch (err) {
      setError("Correo o contraseña incorrectos.");
    }
  };

  return (
    <>
      <WelcomeNavbar />
      <div className="login-container">
        <div className="login-box">
          <h2>Iniciar sesión</h2>

          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          {error && <p className="login-error">{error}</p>}

          <button onClick={handleLogin}>Entrar</button>
        </div>
      </div>
    </>
  );
}
