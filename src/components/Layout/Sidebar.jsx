import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  Send,
  CheckCircle,
  Package,
  CreditCard,
  DollarSign,
  LogOut,
  User,
  Settings,
  ChevronDown,
  ChevronRight,
  Wrench
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const [isRepairOpen, setIsRepairOpen] = useState(false);
  const [isServiceOpen, setIsServiceOpen] = useState(false);

  // Auto-expand repair menu if active tab is one of the sub-items
  useEffect(() => {
    const repairTabs = ['indent', 'sent-machine', 'check-machine', 'store-in', 'repair-advance', 'make-payment'];
    if (repairTabs.includes(activeTab)) {
      setIsRepairOpen(true);
    }

    const serviceTabs = ['service-indent', 'external-parts', 'payment-approval', 'tally-entry'];
    if (serviceTabs.includes(activeTab)) {
      setIsServiceOpen(true);
    }
  }, [activeTab]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'repair',
      label: 'Repair',
      icon: Wrench,
      subItems: [
        { id: 'indent', label: 'Indent', icon: FileText },
        { id: 'sent-machine', label: 'Sent to Vendor', icon: Send },
        { id: 'check-machine', label: 'Check Machine', icon: CheckCircle },
        { id: 'store-in', label: 'Store In', icon: Package },
        { id: 'make-payment', label: 'Make Payment', icon: DollarSign },
      ]
    },
    {
      id: 'service',
      label: 'Service',
      icon: Settings, // Reusing Wrench icon for now, or could use another suitable icon
      subItems: [
        { id: 'service-indent', label: 'Indent', icon: FileText },
        { id: 'external-parts', label: 'External Parts', icon: Package },
        { id: 'payment-approval', label: 'Payment Approval', icon: CheckCircle },
        { id: 'tally-entry', label: 'Tally Entry', icon: FileText },
      ]
    },
  ];

  return (
    <div className="w-64 bg-white shadow-lg h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Repair & Service</h1>
        <div className="mt-4 flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-800">{user?.name}</p>
            <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;

            if (item.subItems) {
              const isActive = item.subItems.some(sub => sub.id === activeTab);
              const isOpen = item.id === 'repair' ? isRepairOpen : isServiceOpen;
              const toggleOpen = item.id === 'repair' ? () => setIsRepairOpen(!isRepairOpen) : () => setIsServiceOpen(!isServiceOpen);

              return (
                <li key={item.id}>
                  <button
                    onClick={toggleOpen}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${isActive || isOpen
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {isOpen && (
                    <ul className="mt-1 ml-4 space-y-1 border-l-2 border-gray-100 pl-2">
                      {item.subItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        return (
                          <li key={subItem.id}>
                            <button
                              onClick={() => setActiveTab(subItem.id)}
                              className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${activeTab === subItem.id
                                ? 'bg-blue-100 text-blue-600 font-medium'
                                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                }`}
                            >
                              <SubIcon className="w-4 h-4" />
                              <span>{subItem.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === item.id
                    ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-1 mb-10 border-t border-gray-200">
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-800 rounded-lg transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>


      </div>
    </div>
  );
};

export default Sidebar;