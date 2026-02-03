import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import Leads from '../pages/Leads';
import Login from '../pages/Login';
import Admin from '../pages/Admin';
import Setting from '../pages/Setting';
import Header from '../components/layouts/Header';
import { useAuth } from '../context/AuthContext';

const AppRoutes: React.FC = () => {
  const { user } = useAuth();
  const token = localStorage.getItem('accessToken');

  const isAuthenticated = !!user || !!token;

  return (
    <>
      {isAuthenticated && <Header />}

      <Routes>
        {/* public */}
        <Route path="/login" element={<Login />} />

        {/* protected */}
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/leads"
          element={isAuthenticated ? <Leads /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin"
          element={isAuthenticated ? <Admin /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <Setting /> : <Navigate to="/login" />}
        />

        {/* fallback */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />}
        />
      </Routes>
    </>
  );
};

export default AppRoutes;
