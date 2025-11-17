import { Routes, Route } from "react-router-dom";
import PrivateRoute from "../components/PrivateRoute";

// Páginas públicas
import Welcome from "../pages/Welcome";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Verify from "../pages/Verify";
import ResendVerify from "../pages/ResendVerify";
import DisputeTerms from '../pages/DisputeTerms';

// Páginas privadas generales
import Home from "../pages/Home";
import Services from "../pages/Services";
import UserProfile from "../pages/UserProfile";
import EditProfile from "../pages/EditProfile";
import FreelancerRegister from "../pages/FreelancerRegister";
import CreateRequest from "../pages/CreateRequest";
import MyRequests from "../pages/MyRequests";
import HireService from "../pages/HireService";
import MyProjects from "../pages/MyProjects";
import ProjectDetails from "../pages/ProjectDetails";

// Admin
import AdminLayout from "../pages/admin/AdminLayout";
import AdminDashboard from "../pages/admin/AdminDashboard";
import DisputeReview from "../pages/admin/DisputeReview";
import FreelancerRequests from "../pages/admin/FreelancerRequests";

// Freelancer
import FreelancerDashboard from "../pages/freelancer/FreelancerDashboard";
import MyServices from "../pages/freelancer/MyServices";
import CreateService from "../pages/freelancer/CreateService";
import FreelancerProfile from "../pages/freelancer/FreelancerProfile";
import EditFreelancerProfile from "../pages/freelancer/EditFreelancerProfile";
import ProposeForm from "../pages/freelancer/ProposeForm";
import PublicFreelancerProfile from "../pages/freelancer/PublicFreelancerProfile";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/resend-verification" element={<ResendVerify />} />
      <Route path="/dispute-terms" element={<DisputeTerms />} />
      <Route path="/freelancer/:username" element={<PublicFreelancerProfile />} />

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
      <Route
        path="/create-request"
        element={
          <PrivateRoute>
            <CreateRequest />
          </PrivateRoute>
        }
      />
      <Route
        path="/MyRequests"
        element={
          <PrivateRoute>
            <MyRequests />
          </PrivateRoute>
        }
      />
      <Route path="/hire/:id" element={<HireService />} />
      <Route path="/my-projects" element={<MyProjects />} />
      <Route path="/projects/:id" element={<ProjectDetails />} />

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

      {/* Privadas solo freelancer */}
      <Route
        path="/FreelancerDashboard"
        element={
          <PrivateRoute requiredRole="freelancer">
            <FreelancerDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/freelancer-profile"
        element={
          <PrivateRoute requiredRole="freelancer">
            <FreelancerProfile />
          </PrivateRoute>
        }
      />
      <Route
        path="/MyServices"
        element={
          <PrivateRoute requiredRole="freelancer">
            <MyServices />
          </PrivateRoute>
        }
      />
      <Route
        path="/CreateService"
        element={
          <PrivateRoute requiredRole="freelancer">
            <CreateService />
          </PrivateRoute>
        }
      />
      <Route 
        path="/edit-freelancer-profile" 
        element={
          <PrivateRoute>
            <EditFreelancerProfile />
          </PrivateRoute>
        } 
      />
      <Route path="/requests/:requestId/propose" element={<ProposeForm />} />
    </Routes>
  );
}
