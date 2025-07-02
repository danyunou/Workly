import { useState } from "react";
import { resendVerification } from "../services/authService"; // Nuevo import

export default function ResendVerify() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // null | sending | success | error
  const [message, setMessage] = useState("");

  const handleResend = async () => {
    if (!email.includes("@")) {
      setMessage("Ingresa un correo válido.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setMessage("");

    try {
      const { ok, data } = await resendVerification(email); // nuevo uso

      if (ok) {
        setStatus("success");
        setMessage("Correo de verificación reenviado correctamente.");
      } else {
        setStatus("error");
        setMessage(data.error || "No se pudo reenviar el correo.");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("Error al reenviar verificación.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "auto", textAlign: "center" }}>
      <h2>Reenviar Verificación</h2>
      <p>Ingresa tu correo para recibir nuevamente el enlace de verificación.</p>
      <input
        type="email"
        placeholder="Correo electrónico"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
      />
      <button onClick={handleResend}>Reenviar correo</button>
      {status && (
        <p style={{ marginTop: "1rem", color: status === "success" ? "green" : "red" }}>
          {message}
        </p>
      )}
    </div>
  );
}
