import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import './styles/index.css';

import { PayPalScriptProvider } from "@paypal/react-paypal-js";

const initialOptions = {
  "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID,
  currency: "USD",
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PayPalScriptProvider options={initialOptions}>
      <BrowserRouter>
        <AuthProvider>
          <div className="layout">
            <App />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </PayPalScriptProvider>
  </React.StrictMode>
);
