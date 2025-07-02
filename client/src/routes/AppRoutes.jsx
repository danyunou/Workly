import { Routes, Route } from "react-router-dom";
import PrivateRoute from "../components/PrivateRoute";

// Páginas públicas
import Welcome from "../pages/Welcome";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Verify from "../pages/Verify";
import ResendVerify from "../pages/ResendVerify";

// Páginas privadas
import Home from "../pages/Home";
import Services from "../pages/Services";
import UserProfile from "../pages/UserProfile";
import EditProfile from "../pages/EditProfile";
import FreelancerRegister from "../pages/FreelancerRegister";

// Admin
import AdminLayout from "../pages/admin/AdminLayout";
import AdminDashboard from "../pages/admin/AdminDashboard";
import DisputeReview from "../pages/admin/DisputeReview";
import FreelancerRequests from "../pages/admin/FreelancerRequests";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/resend-verification" element={<ResendVerify />} />

      {/* Privadas generales */}
      <Route
        path="/home"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      />
      <Route
        path="/services"
        element={
          <PrivateRoute>
            <Services />
          </PrivateRoute>
        }
      />
      <Route
        path="/user-profile"
        element={
          <PrivateRoute>
            <UserProfile />
          </PrivateRoute>
        }
      />
      <Route
        path="/edit-profile"
        element={
          <PrivateRoute>
            <EditProfile />
          </PrivateRoute>
        }
      />
      <Route
        path="/freelancer-register"
        element={
          <PrivateRoute>
            <FreelancerRegister />
          </PrivateRoute>
        }
      />

      {/* Privadas solo admin */}
      <Route
        path="/admin"
        element={
          <PrivateRoute requiredRole="admin">
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/disputas"
        element={
          <PrivateRoute requiredRole="admin">
            <AdminLayout>
              <DisputeReview />
            </AdminLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/solicitudes"
        element={
          <PrivateRoute requiredRole="admin">
            <AdminLayout>
              <FreelancerRequests />
            </AdminLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
