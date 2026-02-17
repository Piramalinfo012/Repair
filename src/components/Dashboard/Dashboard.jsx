import React, { useEffect, useState } from "react";
import { FileText, CheckCircle, DollarSign, BarChart3 } from "lucide-react";
import MetricCard from "./MetricCard";
import ChartCard from "./ChartCard";
import { mockDashboardMetrics } from "../../data/mockData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

// Skeleton Loader Components
const MetricCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      <div className="h-8 bg-gray-200 rounded-full w-8"></div>
    </div>
    <div className="mt-4">
      <div className="h-8 bg-gray-200 rounded w-2/3"></div>
    </div>
    <div className="mt-4 h-2 bg-gray-200 rounded"></div>
  </div>
);

const BarChartSkeleton = () => (
  <div className="h-64 w-full animate-pulse">
    <div className="h-full bg-gray-200 rounded"></div>
  </div>
);

const ListItemSkeleton = () => (
  <div className="flex items-center justify-between py-2 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
    <div className="flex items-center space-x-3">
      <div className="w-20 bg-gray-200 rounded-full h-2"></div>
      <div className="h-4 bg-gray-200 rounded w-8"></div>
    </div>
  </div>
);

const Dashboard = () => {
  const metrics = mockDashboardMetrics;

  const [tasks, setTasks] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [totalCompletedTask, setTotalCompletedTask] = useState([]);
  const [totalRepairBill, setTotalRepairBill] = useState(0);
  const [repairStatusByDepartment, setRepairStatusByDepartment] = useState([]);
  const [paymentTypeDistribution, setPaymentTypeDistribution] = useState([]);
  const [vendorWiseRepairCosts, setVendorWiseRepairCosts] = useState([]);

  const [loading, setLoading] = useState(true);

  const SCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;
  const SHEET_Id = import.meta.env.VITE_SHEET_ID;

  const fetchAllTasks = async () => {
    try {
      setLoading(true);
      const SHEET_NAME_TASK = "Repair System";

      const res = await fetch(
        `${SCRIPT_URL}?sheet=${SHEET_NAME_TASK}`
      );
      const result = await res.json();

      if (!result?.success) {
        console.error("API returned error:", result?.error);
        return;
      }

      // New backend returns simple 2D array in result.data
      // Rows 0-4 are meta/config, Row 5 is headers, Row 6+ is actual data
      const allRows = result?.data || [];
      const taskRows = allRows.slice(6);

      const formattedTasks = taskRows
        .filter((row) => row && row.length > 0 && (row[1] || row[3])) // Filter out empty rows (must have taskNo or machineName)
        .map((row) => {
          // row is now a direct array of values, no .c or .v
          // Parse totalBillRepair as number immediately to avoid string concatenation issues
          const rawBill = row[35];
          const billAmount = rawBill ? parseFloat(String(rawBill).replace(/[^0-9.-]/g, '')) : 0;

          return {
            status: (row[46] || "").toString().trim(),
            actual2: (row[44] || "").toString().trim(), // Column AS (index 44)
            totalBillRepair: isNaN(billAmount) ? 0 : billAmount,
            department: (row[13] || "").toString().trim(),
            paymentType: (row[25] || "").toString().trim(),
            vendorName: (row[19] || "").toString().trim(),
          };
        });

      setTasks(formattedTasks);

      const pending = formattedTasks.filter(
        (task) => task.status.toLowerCase() === "pending" || task.status === ""
      );
      setPendingTasks(pending);

      // Count tasks where column AS (index 44) is not empty as completed
      const completed = formattedTasks.filter(
        (task) => task.actual2 !== ""
      );
      setTotalCompletedTask(completed);

      const totalBill = formattedTasks.reduce((sum, item) => {
        return sum + item.totalBillRepair;
      }, 0);
      setTotalRepairBill(totalBill);

      // Department counts - filter out empty department names
      const departmentCounts = formattedTasks.reduce((acc, task) => {
        const dept = task.department;
        if (dept && dept !== "") {
          acc[dept] = (acc[dept] || 0) + 1;
        }
        return acc;
      }, {});

      const deptData = Object.entries(departmentCounts).map(
        ([department, count]) => ({
          department,
          count,
        })
      );
      setRepairStatusByDepartment(deptData);

      // Payment type distribution - filter out empty types, use numeric addition
      const paymentTypeTotals = formattedTasks.reduce((acc, task) => {
        let type = task.paymentType;
        if (!type || type === "" || type === "undefined") {
          type = "Unknown";
        }
        if (!acc[type]) {
          acc[type] = 0;
        }
        acc[type] += task.totalBillRepair; // Already a number now
        return acc;
      }, {});

      const paymentData = Object.entries(paymentTypeTotals)
        .filter(([type]) => type !== "Unknown" || paymentTypeTotals["Unknown"] > 0)
        .map(([type, amount]) => ({
          type,
          amount: Number(amount) || 0,
        }));
      setPaymentTypeDistribution(paymentData);

      // Vendor-wise repair costs - filter out empty vendor names
      const topRepairs = [...formattedTasks]
        .filter((task) => task.vendorName && task.vendorName !== "")
        .sort((a, b) => b.totalBillRepair - a.totalBillRepair)
        .slice(0, 5)
        .map(task => ({
          vendor: task.vendorName,
          cost: Number(task.totalBillRepair) || 0,
        }));
      setVendorWiseRepairCosts(topRepairs);

    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTasks();
  }, []);


  // console.log("vendorWiseRepairCosts",vendorWiseRepairCosts);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Total Indents"
              value={tasks?.length}
              icon={FileText}
              color="bg-blue-500"
            />
            <MetricCard
              title="Repairs Completed"
              value={totalCompletedTask?.length}
              icon={CheckCircle}
              color="bg-green-500"
            />
            <MetricCard
              title="Total Repair Cost"
              value={`₹${totalRepairBill}`}
              icon={DollarSign}
              color="bg-orange-500"
              trend={{ value: 5, isPositive: false }}
            />
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Repair Status by Department */}
        <ChartCard title="📊 Repair Status by Department">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <ListItemSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {repairStatusByDepartment.map((dept, index) => (
                <div
                  key={dept.department}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {dept.department}
                  </span>
                  <div className="flex items-center space-x-3">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(dept.count /
                            Math.max(
                              ...repairStatusByDepartment.map(
                                (d) => d.count
                              )
                            )) *
                            100
                            }%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8">
                      {dept.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        {/* Task Status Overview */}
        <ChartCard title="📈 Task Status Overview">
          {loading ? (
            <BarChartSkeleton />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Pending', value: pendingTasks.length },
                    { name: 'Completed', value: totalCompletedTask.length },
                  ]}
                  margin={{
                    top: 20,
                    right: 20,
                    left: 0,
                    bottom: 20,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    fill="#8884d8"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1500}
                  >
                    <LabelList dataKey="value" position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Payment Type Distribution */}
        <ChartCard title="💸 Payment Type Distribution">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <ListItemSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {paymentTypeDistribution.map((payment, index) => {
                const colors = ["bg-blue-500", "bg-green-500", "bg-orange-500"];
                return (
                  <div
                    key={payment.type}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${colors[index % colors.length]
                          }`}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {payment.type}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      ₹{(Number(payment.amount) || 0).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        {/* Vendor-Wise Repair Costs */}
        <ChartCard title="📦 Vendor-Wise Repair Costs">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <ListItemSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {vendorWiseRepairCosts.map((vendor, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {vendor.vendor}
                  </span>
                  <div className="flex items-center space-x-3">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(vendor.cost /
                            (Math.max(
                              ...vendorWiseRepairCosts.map(
                                (v) => v.cost
                              )
                            ) || 1)) *
                            100
                            }%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-16">
                      ₹{(Number(vendor.cost) || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

export default Dashboard;