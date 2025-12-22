
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import Leads from '../pages/Leads';
import Login from '../pages/Login';
import Setting from '../pages/Setting'
import Admin from '../pages/Admin'
import Header from '../components/layouts/Header';
import { useAuth } from '../context/AuthContext';

const AppRoutes: React.FC = () => {
  const { username } = useAuth();

  return (
    <>
      {username && <Header />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={username ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/leads"
          element={username ? <Leads /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin"
          element={username ? <Admin /> : <Navigate to="/login" />}
        />
        <Route
          path="/setting"
          element={username ? <Setting /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to={username ? '/dashboard' : '/login'} />} />
      </Routes>
    </>
  );
};

export default AppRoutes;
