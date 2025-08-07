import axios from 'axios';

const API_URL = 'https://workly-cy4b.onrender.com/api/auth'; // Ajusta según tu backend

export const registerUser = async (userData) => {
  const response = await axios.post(`${API_URL}/register`, userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await axios.post(`${API_URL}/login`, credentials);
  return response.data;
};

export const verifyAccount = async (token, email) => {
  const response = await fetch(
    `${API_URL}/verify?token=${token}&email=${email}` // ✅ Usa base /api/auth
  );

  const data = await response.json();
  return { ok: response.ok, data };
};

export const resendVerification = async (email) => {
  const response = await fetch("https://workly-cy4b.onrender.com/api/auth/send-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  return { ok: response.ok, data };
};


export const verifyToken = async (token) => {
  const response = await axios.post(`${API_URL}/verify`, { token });
  return response.data;
};
