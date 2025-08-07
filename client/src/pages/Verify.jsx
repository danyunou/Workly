import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { verifyAccount, resendVerification } from "../services/authService";

export default function Verify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("verifying"); // verifying | success | expired | invalid | error
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [resendStatus, setResendStatus] = useState(null); // null | sending | success | error
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    const verify = async () => {
      const token = searchParams.get("token");
      const userEmail = searchParams.get("email");
      setEmail(userEmail);

      if (!token || !userEmail) {
        setStatus("invalid");
        return;
      }

      try {
        const { ok, data } = await verifyAccount(token, userEmail);

        if (ok) {
          setStatus("success");
          setMessage(data.message);
          setTimeout(() => navigate("/login"), 4000);
        } else if (data.error === "El token ha expirado.") {
          setStatus("expired");
        } else {
          setStatus("invalid");
        }
      } catch (err) {
        console.error("Error verificando cuenta:", err);
        setStatus("error");
      }
    };

    verify();
  }, [searchParams, navigate]);

  const handleResend = async () => {
    if (!email) return;

    setResendStatus("sending");
    setResendMessage("");

    const { ok, data } = await resendVerification(email);

    if (ok) {
      setResendStatus("success");
      setResendMessage("✅ Correo reenviado correctamente.");
    } else {
      setResendStatus("error");
      setResendMessage(data.error || "❌ Error al reenviar el correo.");
    }
  };

  const renderResendButton = () => (
    <>
      <button
        onClick={handleResend}
        disabled={resendStatus === "sending"}
        style={{
          padding: "0.5rem 1rem",
          cursor: resendStatus === "sending" ? "not-allowed" : "pointer",
          marginTop: "1rem",
        }}
      >
        {resendStatus === "sending" ? "Enviando..." : "Reenviar verificación"}
      </button>
      {resendMessage && (
        <p style={{ marginTop: "1rem", color: resendStatus === "success" ? "green" : "red" }}>
          {resendMessage}
        </p>
      )}
    </>
  );

  const renderContent = () => {
    switch (status) {
      case "verifying":
        return <p>Verificando tu cuenta...</p>;
      case "success":
        return (
          <>
            <p style={{ color: "green" }}>{message}</p>
            <p>Redirigiendo al inicio de sesión...</p>
          </>
        );
      case "expired":
        return (
          <>
            <p style={{ color: "orange" }}>El enlace de verificación ha expirado.</p>
            {renderResendButton()}
          </>
        );
      case "invalid":
        return (
          <>
            <p style={{ color: "red" }}>
              El enlace es inválido o está incompleto. Verifica tu correo o intenta nuevamente.
            </p>
            {renderResendButton()}
          </>
        );
      case "error":
        return <p style={{ color: "red" }}>Hubo un error interno al verificar tu cuenta.</p>;
      default:
        return null;
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h2>Verificación de Cuenta</h2>
      {renderContent()}
    </div>
  );
}
