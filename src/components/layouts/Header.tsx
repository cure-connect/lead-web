import React, { useState } from "react";
import {
  User,
  LayoutDashboard,
  Settings,
  Users,
  Menu,
  X,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { username } = useAuth();
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
    // {
    //   name: "Admin",
    //   path: "admin",
    //   icon: <User className="w-4 h-4" />,
    // },
    {
      name: "Settings",
      path: "setting",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const navigateAndClose = (path: string) => {
    navigate(`/${path}`);
    setOpenMenu(false);
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">🏠</span>
            </div>
            <span className="text-lg font-semibold text-gray-800">
              Leads Manager
            </span>
          </div>

          {/* Desktop Navigation */}
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

            <div className="px-3 py-2 text-sm font-medium text-gray-700">
              {username ? (
                `Hi, ${username}`
              ) : (
                <User className="w-5 h-5 text-indigo-600" />
              )}
            </div>
          </div>

          {/* Mobile Hamburger */}
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

        {/* Mobile Menu */}
        {openMenu && (
          <div className="md:hidden bg-gray-50 border-t py-3 space-y-1 animate-fadein">
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

            <div className="px-4 py-3 text-gray-700 text-sm">
              {username ? (
                `Hi, ${username}`
              ) : (
                <User className="w-5 h-5 text-indigo-600" />
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
