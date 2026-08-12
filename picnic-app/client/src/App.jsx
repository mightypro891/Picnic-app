import { Routes, Route } from 'react-router-dom';

import Home from './pages/Home.jsx';
import Register from './pages/Register.jsx';
import RegistrationSuccess from './pages/RegistrationSuccess.jsx';
import TicketPage from './pages/TicketPage.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import NotFound from './pages/NotFound.jsx';

import RequireAdmin from './components/RequireAdmin.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Overview from './pages/admin/Overview.jsx';
import Registrations from './pages/admin/Registrations.jsx';
import RegistrationDetail from './pages/admin/RegistrationDetail.jsx';
import Scanner from './pages/admin/Scanner.jsx';
import Attendees from './pages/admin/Attendees.jsx';
import PromoGraphic from './pages/admin/PromoGraphic.jsx';
import SecurityLog from './pages/admin/SecurityLog.jsx';
import Backups from './pages/admin/Backups.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/register/success" element={<RegistrationSuccess />} />
      <Route path="/ticket/:accessToken" element={<TicketPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/forgot-password" element={<ForgotPassword />} />
      <Route path="/admin/reset-password" element={<ResetPassword />} />

      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<Overview />} />
        <Route path="registrations" element={<Registrations />} />
        <Route path="registrations/:id" element={<RegistrationDetail />} />
        <Route path="scanner" element={<Scanner />} />
        <Route path="attendees" element={<Attendees />} />
        <Route path="promo" element={<PromoGraphic />} />
        <Route path="security-log" element={<SecurityLog />} />
        <Route path="backups" element={<Backups />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
