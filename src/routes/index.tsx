import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Leads from "../pages/Leads";
import Login from "../pages/Login";
import Setting from "../pages/Setting";
import Admin from "../pages/Admin";
import Header from "../components/layouts/Header";
import { useAuth } from "../context/AuthContext";

const AppRoutes: React.FC = () => {
  const { username } = useAuth();

  return (
    <>
      <Header />

      <Routes>
        {/*
        <Route path="/login" element={<Login />} />
        */}

        <Route path="/leads" element={<Leads />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/setting" element={<Setting />} />

        <Route path="*" element={<Navigate to="/leads" />} />
      </Routes>
    </>
  );
};

export default AppRoutes;
