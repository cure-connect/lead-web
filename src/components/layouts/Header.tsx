import React, { useState } from "react";
import logo from "../../assets/leads-logo.svg";
import {
  LayoutDashboard,
  Settings,
  Users,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [openMenu, setOpenMenu] = useState(false);

  const currentPage = location.pathname.replace("/", "") || "dashboard";

  const navItems = [
    {
      name: "Dashboard",
      path: "dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      name: "Leads",
      path: "leads",
      icon: <Users className="w-4 h-4" />,
    },
    {
      name: "Settings",
      path: "settings",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const navigateAndClose = (path: string) => {
    navigate(`/${path}`);
    setOpenMenu(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Leads Logo"
              className="w-36 h-10 object-contain"
            />
            <span className="text-lg font-semibold text-gray-800">
              Leads Manager
            </span>
          </div>

          {/* Desktop */}
          <div className="hidden md:flex items-center space-x-6">
            <nav className="flex space-x-4">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(`/${item.path}`)}
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                    currentPage === item.path
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {item.icon}
                  {item.name}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">
                Hi, {user?.username}
              </span>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setOpenMenu(!openMenu)}
          >
            {openMenu ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {openMenu && (
          <div className="md:hidden bg-gray-50 border-t py-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigateAndClose(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium rounded-md ${
                  currentPage === item.path
                    ? "text-indigo-600 bg-indigo-100"
                    : "text-gray-700 hover:bg-gray-200"
                }`}
              >
                {item.icon}
                {item.name}
              </button>
            ))}

            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-700">
                Hi, {user?.username}
              </span>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-red-600"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
