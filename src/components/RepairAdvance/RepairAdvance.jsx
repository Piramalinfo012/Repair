import React, { useEffect, useState } from "react";
import { Search, Filter, CreditCard } from "lucide-react";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../ui/Table";
import { mockRepairTasks } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";

const RepairAdvance = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState(mockRepairTasks);

  const [pendingTasks, setPendingTasks] = useState([]);
  const [historyTasks, setHistoryTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [formData, setFormData] = useState({
    totalBillAmount: "",
    paymentType: "",
    toBePaidAmount: "",
  });

  const filteredTasks = tasks.filter(
    (task) => user?.role === "admin" || task.nameOfIndenter === user?.name
  );

  // const pendingTasks = filteredTasks.filter((task) => task.status === "stored");
  // const historyTasks = filteredTasks.filter(
  //   (task) => task.status === "advanced"
  // );

  const handleMaterialClick = (task) => {
    setSelectedTask(task);
    setFormData({
      totalBillAmount: task.totalBillAmount?.toString() || "",
      paymentType: task.paymentType || "",
      toBePaidAmount: task.toBePaidAmount?.toString() || "",
    });
    setIsModalOpen(true);
  };

  const SCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;
  const SHEET_Id = import.meta.env.VITE_SHEET_ID;
  const FOLDER_ID = import.meta.env.VITE_FOLDER_ID;

  const fetchAllTasks = async () => {
    // console.log("selectedTaskType", selectedTaskType);
    try {
      setLoadingTasks(true);
      const SHEET_NAME_TASK = "Repair System";

      const res = await fetch(
        `${SCRIPT_URL}?sheet=${SHEET_NAME_TASK}`
      );
      const result = await res.json();

      const allRows = result?.data || [];

      // Skip first 5 rows (index 0 to 4)
      const taskRows = allRows.slice(5);

      const formattedTasks = taskRows.map((row) => {
        // row is directly an array of values

        return {
          timestamp: row[0] || "",
          taskNo: row[1] || "",
          serialNo: row[2] || "",
          machineName: row[3] || "",
          machinePartName: row[4] || "",
          givenBy: row[5] || "",
          doerName: row[6] || "",
          problem: row[7] || "",
          enableReminder: row[8] || "",
          requireAttachment: row[9] || "",
          taskStartDate: row[10] || "",
          taskEndDate: row[11] || "",
          priority: row[12] || "",
          department: row[13] || "",
          location: row[14] || "",
          imageUrl: row[15] || "",
          planned: row[16] || "",
          actual: row[17] || "",
          delay: row[18] || "",
          vendorName: row[19] || "",
          leadTimeToDeliverDays: row[20] || "",
          transporterName: row[21] || "",
          transportationCharges: row[22] || "",
          weighmentSlip: row[23] || "",
          transportingImageWithMachine: row[24] || "",
          planned1: row[25] || "",
          actual1: row[26] || "",
          paymentType: row[30] || "", // Check index mapping carefully
          billNo: row[31] || "",
          typeOfBill: row[32] || "",
          totalBillAmount: row[33] || "",
          // paymentType: row[34] || "", // Duplicate in original?
          toBePaidAmount: row[35] || "",
          planned2: row[36] || "",
          actual2: row[37] || "",
          delay2: row[38] || "",
          receivedQuantity: row[39] || "",
          billMatch: row[40] === "TRUE" || false,
          productImage: row[41] || "",
        };
      });

      // Planned2	,Actual2	,Delay2,	Received Quantity,	Bill Match,	Product Image,

      // console.log("Formatted Tasks:", formattedTasks);
      setTasks(formattedTasks);

      // Set pending tasks

      const pendingTasks = formattedTasks.filter((task) => task.actual2 === "");
      setPendingTasks(pendingTasks);

      // Set history tasks
      const historyTasks = formattedTasks.filter(
        (task) => task.actual2 !== "" && task.planned2 !== ""
      );
      setHistoryTasks(historyTasks);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchAllTasks();
  }, []);

  // const handleSubmit = (e) => {
  //   e.preventDefault();
  //   if (selectedTask) {
  //     setTasks((prev) =>
  //       prev.map((task) =>
  //         task.id === selectedTask.id
  //           ? {
  //               ...task,
  //               status: "advanced",
  //               totalBillAmount: Number(formData.totalBillAmount),
  //               paymentType: formData.paymentType,
  //               toBePaidAmount: Number(formData.toBePaidAmount),
  //             }
  //           : task
  //       )
  //     );
  //     setIsModalOpen(false);
  //   }
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitLoading(true);
      let billImageUrl = "";
      if (formData.productImage) {
        billImageUrl = await uploadFileToDrive(formData.productImage);
      }

      const payload = {
        action: "update1",
        sheetName: "Repair System",
        taskNo: selectedTask.taskNo,

        // Required Headers:
        Actual2: new Date().toLocaleString("en-GB", {
          timeZone: "Asia/Kolkata",
        }),
        "Received Quantity": formData.receivedQuantity,
        "Bill Match": formData.billMatch,
        "Bill Image": billImageUrl,
        "Bill No.": formData.billNo,
        "Product Image": billImageUrl,
      };

      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(payload).toString(),
      });

      const result = await response.json();
      console.log("Update result:", result);

      if (result.success) {
        alert("✅ Task updated successfully");
        setIsModalOpen(false);
        fetchAllTasks(); // refresh the table
      } else {
        alert("❌ Failed to update task: " + result.message);
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("❌ Something went wrong while submitting");
    } finally {
      setSubmitLoading(false);
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Repair Advance</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("pending")}
              className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors duration-200 ${activeTab === "pending"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              Pending ({pendingTasks.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors duration-200 ${activeTab === "history"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              History ({historyTasks.length})
            </button>
          </nav>
        </div>

        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search tasks..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Button variant="secondary" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {activeTab === "pending" && (
          <div>
            <Table>
              <TableHeader>
                <TableHead>Action</TableHead>
                <TableHead>Task Number</TableHead>
                <TableHead>Machine Name</TableHead>
                <TableHead>Part Name</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Received Qty</TableHead>
                <TableHead>Bill Match</TableHead>
              </TableHeader>
              <TableBody>
                {pendingTasks.map((task) => (
                  <TableRow key={task.taskNo}>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleMaterialClick(task)}
                        className="flex items-center"
                      >
                        <CreditCard className="w-3 h-3 mr-1" />
                        Material
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium text-blue-600">
                      {task.taskNo}
                    </TableCell>
                    <TableCell>{task.machineName}</TableCell>
                    <TableCell>{task.machinePartName}</TableCell>
                    <TableCell>{task.vendorName || "-"}</TableCell>
                    <TableCell>{task.receivedQuantity || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${task.billMatch
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                          }`}
                      >
                        {task.billMatch ? "Matched" : "Not Matched"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {loadingTasks && (
              <div className="flex flex-col items-center justify-center w-[75vw] mt-10">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600">Loading tasks...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div>
            <Table>
              <TableHeader>
                <TableHead>Task Number</TableHead>
                <TableHead>Machine Name</TableHead>
                <TableHead>Part Name</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Payment Type</TableHead>
                <TableHead>To Be Paid</TableHead>
              </TableHeader>
              <TableBody>
                {historyTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium text-blue-600">
                      {task.taskNo}
                    </TableCell>
                    <TableCell>{task.machineName}</TableCell>
                    <TableCell>{task.machinePartName}</TableCell>
                    <TableCell>{task.vendorName || "-"}</TableCell>
                    <TableCell>
                      ₹{task.totalBillAmount?.toLocaleString() || "-"}
                    </TableCell>
                    <TableCell>{task.paymentType || "-"}</TableCell>
                    <TableCell>
                      ₹{task.toBePaidAmount?.toLocaleString() || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {loadingTasks && (
              <div className="flex flex-col items-center justify-center w-[75vw] mt-10">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600">Loading tasks...</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Repair Advance Details"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repair Task Number (Read-only)
              </label>
              <input
                type="text"
                value={selectedTask?.taskNo || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Machine Name (Read-only)
              </label>
              <input
                type="text"
                value={selectedTask?.machineName || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor Name (Read-only)
              </label>
              <input
                type="text"
                value={selectedTask?.vendorName || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Bill Amount *
              </label>
              <input
                type="number"
                value={selectedTask?.totalBillAmount}
                readOnly
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    totalBillAmount: e.target.value,
                  }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Type *
              </label>
              <select
                value={formData.paymentType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    paymentType: e.target.value,
                  }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Payment Type</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Credit Card">Credit Card</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Be Paid Amount *
              </label>
              <input
                type="number"
                value={formData.toBePaidAmount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    toBePaidAmount: e.target.value,
                  }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Submit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RepairAdvance;
