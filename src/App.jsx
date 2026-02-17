import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./components/Layout/Sidebar";
import Dashboard from "./components/Dashboard/Dashboard";
import Indent from "./components/Indent/Indent";
import SentMachine from "./components/SentMachine/SentMachine";
import CheckMachine from "./components/CheckMachine/CheckMachine";
import StoreIn from "./components/StoreIn/StoreIn";
import RepairAdvance from "./components/RepairAdvance/RepairAdvance";
import MakePayment from "./components/MakePayment/MakePayment";
import ExternalPartsDetails from "./components/Service/ExternalPartsDetails";
import PaymentApproval from "./components/Service/PaymentApproval";
import TallyEntry from "./components/Service/TallyEntry";
import ServiceIndent from "./components/Service/ServiceIndent";
import Login from "./components/Login/Login";
import { MenuOutlined, CloseOutlined } from "@ant-design/icons";

function AppContent() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect to root if not logged in and on a subpath
  useEffect(() => {
    if (!user && location.pathname !== "/") {
      navigate("/", { replace: true });
    }
  }, [user, location.pathname, navigate]);

  // Map route path to sidemenu tab ID
  const getActiveTab = (pathname) => {
    switch (pathname) {
      case "/dashboard": return "dashboard";
      case "/indent": return "indent";
      case "/sent-machine": return "sent-machine";
      case "/check-machine": return "check-machine";
      case "/store-in": return "store-in";
      case "/make-payment": return "make-payment";
      // Service Module
      case "/service-indent": return "service-indent";
      case "/external-parts": return "external-parts";
      case "/payment-approval": return "payment-approval";
      case "/tally-entry": return "tally-entry";
      default: return "dashboard";
    }
  };

  const activeTab = getActiveTab(location.pathname);

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen">
      {/* Mobile Hamburger Icon - Right Side */}
      <button
        className="absolute top-4 right-4 z-50 md:hidden bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition"
        onClick={() => setSidebarOpen(true)}
      >
        <MenuOutlined style={{ fontSize: "20px" }} />
      </button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 transform bg-white shadow-md z-50 w-64 transition-transform duration-300 md:relative md:translate-x-0 md:z-10 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Close Icon (mobile) */}
        <div className="flex justify-end p-4 md:hidden">
          <button
            className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
            onClick={() => setSidebarOpen(false)}
          >
            <CloseOutlined style={{ fontSize: "18px" }} />
          </button>
        </div>

        {/* Sidebar with click-to-close in mobile */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            navigate(`/${tab}`);
            setSidebarOpen(false);
          }}
        />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content + Footer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          <div className="p-8 h-full">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/indent" element={<Indent />} />
              <Route path="/sent-machine" element={<SentMachine />} />
              <Route path="/check-machine" element={<CheckMachine />} />
              <Route path="/store-in" element={<StoreIn />} />
              <Route path="/make-payment" element={<MakePayment />} />

              {/* Service Routes */}
              <Route path="/service-indent" element={<ServiceIndent />} />
              <Route path="/external-parts" element={<ExternalPartsDetails />} />
              <Route path="/payment-approval" element={<PaymentApproval />} />
              <Route path="/tally-entry" element={<TallyEntry />} />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>

        {/* Footer - only spans main content area */}
        <footer className="bg-white border-t border-gray-200 py-3 px-4">
          <div className="container mx-auto text-center text-sm text-gray-600">
            Powered by{' '}
            <a
              href="https://www.botivate.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Botivate
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}


export default App;
