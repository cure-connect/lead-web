import React from "react";
import logo from "../../assets/leads-logo.svg";
import {
  LayoutDashboard,
  Settings,
  Users,
  LogOut,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const currentPage = location.pathname.replace("/", "") || "dashboard";

  const navItems = [
    {
      name: "Dashboard",
      path: "dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      name: "Leads",
      path: "leads",
      icon: <Users className="w-5 h-5" />,
    },
    {
      name: "Settings",
      path: "settings",
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const handleLogout = () => {
    localStorage.clear();
    logout();
    navigate("/login");
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white shadow z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="Leads Logo"
                className="w-28 sm:w-36 h-8 sm:h-10 object-contain"
              />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <nav className="flex space-x-4">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(`/${item.path}`)}
                    className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${currentPage === item.path
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
                  Hi, {user?.clinicName}
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

            <div className="md:hidden text-right">
              <p className="text-[10px] text-gray-400 leading-tight">คลินิก</p>
              <p className="text-xs font-semibold text-gray-800 max-w-[120px] truncate">
                {user?.clinicName || user?.username}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="h-14 sm:h-[72px]"></div>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40">
        <div className="flex justify-around items-center h-16 pb-safe">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(`/${item.path}`)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all ${currentPage === item.path
                ? "text-indigo-600"
                : "text-gray-400 active:text-gray-600"
                }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${currentPage === item.path ? "bg-indigo-50" : ""
                }`}>
                {React.cloneElement(item.icon, {
                  className: `w-5 h-5 ${currentPage === item.path ? "stroke-[2.5]" : ""}`
                })}
              </div>
              <span className={`text-[10px] mt-0.5 ${currentPage === item.path ? "font-bold" : "font-medium"
                }`}>
                {item.name}
              </span>
            </button>
          ))}

          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-gray-400 active:text-red-600 transition-all"
          >
            <div className="p-1.5">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 font-medium">ออกจากระบบ</span>
          </button>
        </div>
      </nav>

      <div className="md:hidden"></div>
    </>
  );
};

export default Header;