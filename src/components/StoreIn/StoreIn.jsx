import React, { useEffect, useState } from "react";
import { Search, Filter, Package, Loader2Icon } from "lucide-react";
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
import { useAuth } from "../../context/AuthContext";
import useDataStore from "../../store/dataStore";
import toast from "react-hot-toast";

const StoreIn = () => {
  const { user } = useAuth();
  const {
    repairTasks,
    pendingRepairTasks,
    historyRepairTasks,
    setRepairTasks,
    setPendingRepairTasks,
    setHistoryRepairTasks,
    updateRepairTask
  } = useDataStore();

  const [activeTab, setActiveTab] = useState("pending");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    receivedQuantity: "",
    billMatch: false,
    productImage: "",
    billNo: ""
  });

  // Safe filtering with search functionality
  const filteredPendingTasks = pendingRepairTasks
    .filter((task) => user?.role === "admin" || task.nameOfIndenter === user?.name)
    .filter((task) =>
      (task.taskNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.machineName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.serialNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.vendorName || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

  const filteredHistoryTasks = historyRepairTasks
    .filter((task) => user?.role === "admin" || task.nameOfIndenter === user?.name)
    .filter((task) =>
      (task.taskNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.machineName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.serialNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.vendorName || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleMaterialClick = (task) => {
    setSelectedTask(task);
    setFormData({
      receivedQuantity: task.receivedQuantity || "",
      billMatch: task.billMatch === "Yes",
      productImage: "",
      billNo: task.billNo || ""
    });
    setIsModalOpen(true);
  };

  const SCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;
  const SHEET_Id = import.meta.env.VITE_SHEET_ID;
  const FOLDER_ID = import.meta.env.VITE_FOLDER_ID;

  const fetchAllTasks = async () => {
    try {
      setLoadingTasks(true);
      const SHEET_NAME_TASK = "Repair System";

      const res = await fetch(
        `${SCRIPT_URL}?sheet=${SHEET_NAME_TASK}`
      );
      const result = await res.json();

      const allRows = result?.data || [];
      const taskRows = allRows.slice(5);

      const formattedTasks = taskRows.map((row, index) => {
        // row is directly an array of values
        const rowIndex = index + 6;

        // Safe cell value extraction
        const getCellValue = (index) => {
          return row[index] || "";
        };

        return {
          id: `store-task-${index}`, // Add unique id
          rowIndex: rowIndex,
          timestamp: getCellValue(0),
          taskNo: getCellValue(1),
          serialNo: getCellValue(2),
          machineName: getCellValue(3),
          machinePartName: getCellValue(4),
          givenBy: getCellValue(5),
          doerName: getCellValue(6),
          problem: getCellValue(7),
          enableReminder: getCellValue(8),
          requireAttachment: getCellValue(9),
          taskStartDate: getCellValue(10),
          taskEndDate: getCellValue(11),
          priority: getCellValue(12),
          department: getCellValue(13),
          location: getCellValue(14),
          imageUrl: getCellValue(15),
          planned: getCellValue(16),
          actual: getCellValue(17),
          delay: getCellValue(18),
          vendorName: getCellValue(19),
          leadTimeToDeliverDays: getCellValue(20),
          transporterName: getCellValue(21),
          transportationCharges: getCellValue(22),
          weighmentSlip: getCellValue(23),
          transportingImageWithMachine: getCellValue(24),
          paymentType: getCellValue(25),
          howMuch: getCellValue(26),
          planned1: getCellValue(27),
          actual1: getCellValue(28),
          tranporterName: getCellValue(30),
          billImage: getCellValue(32),
          billNo: getCellValue(33),
          typeOfBill: getCellValue(34),
          totalBillAmount: getCellValue(35),
          toBePaidAmount: getCellValue(36),
          planned2: getCellValue(37),
          actual2: getCellValue(38),
          delay2: getCellValue(39),
          receivedQuantity: getCellValue(40),
          billMatch: getCellValue(41),
          productImage: getCellValue(42),
        };
      });

      console.log("Formatted Store Tasks:", formattedTasks);
      setRepairTasks(formattedTasks);

      // Filter pending tasks (has planned2 but no actual2)
      const pendingTasks = formattedTasks.filter(
        (task) => task.planned2 && !task.actual2
      );
      console.log("Pending Tasks:", pendingTasks);
      setPendingRepairTasks(pendingTasks);

      // Filter history tasks (has both planned2 and actual2)
      const historyTasks = formattedTasks.filter(
        (task) => task.planned2 && task.actual2
      );
      console.log("History Tasks:", historyTasks);
      setHistoryRepairTasks(historyTasks);

    } catch (err) {
      console.error("Error fetching tasks:", err);
      toast.error("Failed to fetch tasks");
      // Set empty arrays on error to prevent undefined states
      setRepairTasks([]);
      setPendingRepairTasks([]);
      setHistoryRepairTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchAllTasks();
  }, []);

  const uploadFileToDrive = async (file) => {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        const base64Data = reader.result;

        try {
          const res = await fetch(SCRIPT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              action: "uploadFile",
              base64Data: base64Data,
              fileName: file.name,
              mimeType: file.type,
              folderId: FOLDER_ID,
            }).toString(),
          });

          const data = await res.json();

          if (data.success && data.fileUrl) {
            resolve(data.fileUrl);
          } else {
            toast.error("❌ File upload failed");
            resolve("");
          }
        } catch (err) {
          console.error("Upload error:", err);
          toast.error("❌ Upload failed due to network error");
          resolve("");
        }
      };

      reader.onerror = () => {
        reject("❌ Failed to read file");
      };

      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitLoading(true);
      let billImageUrl = "";
      if (formData.productImage) {
        billImageUrl = await uploadFileToDrive(formData.productImage);
      }

      // Use Update Cell to avoid overwriting other columns
      // Mapping based on flow:
      // Index 38 (AM) -> Actual 3 (Date) (Col 39)
      // Index 40 (AO) -> Received Quantity (Col 41)
      // Index 41 (AP) -> Bill Match (Col 42)
      // Index 42 (AQ) -> Product Image (Col 43)

      const actual2Date = new Date().toLocaleDateString("en-GB", {
        timeZone: "Asia/Kolkata",
      });

      const updates = [
        { colIndex: 39, value: actual2Date },
        { colIndex: 41, value: formData.receivedQuantity },
        { colIndex: 42, value: formData.billMatch ? "Yes" : "No" },
        { colIndex: 43, value: billImageUrl },
      ];

      const updatePromises = updates.map(update => {
        if (update.value === undefined) return Promise.resolve();

        const payload = {
          action: "updateCell",
          sheetName: "Repair System",
          rowIndex: selectedTask.rowIndex,
          columnIndex: update.colIndex,
          value: update.value
        };

        return fetch(SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams(payload).toString(),
        }).then(res => res.json());
      });

      const results = await Promise.all(updatePromises);
      const failed = results.find(r => !r.success);

      if (!failed) {
        // Update the Zustand store
        updateRepairTask(selectedTask.taskNo, {
          actual2: actual2Date,
          receivedQuantity: formData.receivedQuantity,
          billMatch: formData.billMatch ? "Yes" : "No",
          productImage: billImageUrl
        });

        // Refresh data after successful update
        await fetchAllTasks();

        toast.success("✅ Task updated successfully");
        setIsModalOpen(false);
      } else {
        toast.error("❌ Failed to update task: " + (failed.message || failed.error));
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("❌ Something went wrong while submitting");
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount || isNaN(Number(amount))) return "-";
    return `₹${Number(amount).toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Store In</h1>
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
              Pending ({filteredPendingTasks.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors duration-200 ${activeTab === "history"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              History ({filteredHistoryTasks.length})
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Button variant="secondary" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchAllTasks}
              disabled={loadingTasks}
            >
              {loadingTasks ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {activeTab === "pending" && (
          <div className="overflow-x-auto">
            {loadingTasks ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600">Loading tasks...</p>
              </div>
            ) : filteredPendingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500">No pending tasks found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableHead>Action</TableHead>
                  <TableHead>Task Number</TableHead>
                  <TableHead>Machine Name</TableHead>
                  <TableHead>Serial No</TableHead>
                  <TableHead>Planned Date</TableHead>
                  <TableHead>Indenter</TableHead>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Lead Time</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Transporter Amount</TableHead>
                  <TableHead>Bill Image</TableHead>
                  <TableHead>Bill No</TableHead>
                  <TableHead>Total Bill Amount</TableHead>
                  <TableHead>To Be Paid</TableHead>
                </TableHeader>
                <TableBody>
                  {filteredPendingTasks.map((task) => (
                    <TableRow key={task.id || task.taskNo}>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleMaterialClick(task)}
                          className="flex items-center"
                        >
                          <Package className="w-3 h-3 mr-1" />
                          Material
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium text-blue-600">
                        {task.taskNo || "-"}
                      </TableCell>
                      <TableCell>{task.machineName || "-"}</TableCell>
                      <TableCell>{task.serialNo || "-"}</TableCell>
                      <TableCell>{task.planned2 || "-"}</TableCell>
                      <TableCell>{task.doerName || "-"}</TableCell>
                      <TableCell>{task.vendorName || "-"}</TableCell>
                      <TableCell>{task.leadTimeToDeliverDays || "-"}</TableCell>
                      <TableCell>{task.paymentType || "-"}</TableCell>
                      <TableCell>{task.howMuch || "-"}</TableCell>
                      <TableCell>
                        {task.billImage ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => window.open(task.billImage, "_blank")}
                          >
                            View
                          </Button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{task.billNo || "-"}</TableCell>
                      <TableCell>{formatCurrency(task.totalBillAmount)}</TableCell>
                      <TableCell>{formatCurrency(task.toBePaidAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="overflow-x-auto">
            {loadingTasks ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600">Loading tasks...</p>
              </div>
            ) : filteredHistoryTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500">No history tasks found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableHead>Task Number</TableHead>
                  <TableHead>Machine Name</TableHead>
                  <TableHead>Serial No</TableHead>
                  <TableHead>Part Name</TableHead>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Received Quantity</TableHead>
                  <TableHead>Bill Image</TableHead>
                  <TableHead>Bill Amount</TableHead>
                  <TableHead>To Be Paid</TableHead>
                  <TableHead>Bill Match</TableHead>
                </TableHeader>
                <TableBody>
                  {filteredHistoryTasks.map((task) => (
                    <TableRow key={task.id || task.taskNo}>
                      <TableCell className="font-medium text-blue-600">
                        {task.taskNo || "-"}
                      </TableCell>
                      <TableCell>{task.machineName || "-"}</TableCell>
                      <TableCell>{task.serialNo || "-"}</TableCell>
                      <TableCell>{task.machinePartName || "-"}</TableCell>
                      <TableCell>{task.vendorName || "-"}</TableCell>
                      <TableCell>{task.receivedQuantity || "-"}</TableCell>
                      <TableCell>
                        {task.billImage ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => window.open(task.billImage, "_blank")}
                          >
                            View
                          </Button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(task.totalBillAmount)}</TableCell>
                      <TableCell>{formatCurrency(task.toBePaidAmount)}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${task.billMatch === "Yes"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                            }`}
                        >
                          {task.billMatch === "Yes" ? "Matched" : "Not Matched"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Store In Material"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Received *
              </label>
              <select
                value={formData.receivedQuantity}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    receivedQuantity: e.target.value,
                  }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Product Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  productImage: e.target.files[0] || "",
                }))
              }
              className="block w-full text-sm text-gray-500
               file:mr-4 file:py-2 file:px-4
               file:rounded-full file:border-0
               file:text-sm file:font-semibold
               file:bg-blue-50 file:text-blue-700
               hover:file:bg-blue-100"
            />
          </div>

          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.billMatch}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    billMatch: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Bill Match</span>
            </label>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitLoading}>
              {submitLoading && <Loader2Icon className="animate-spin mr-2" />}
              Submit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StoreIn;