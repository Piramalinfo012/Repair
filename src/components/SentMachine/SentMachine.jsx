import React, { useEffect, useState } from "react";
import { Search, Filter, Send, Loader2Icon } from "lucide-react";
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

const SentMachine = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [historyTasks, setHistoryTasks] = useState([]);
  const [loaderSubmit, setLoaderSubmit] = useState(false);
  const [formData, setFormData] = useState({
    vendorName: "",
    transporterName: "",
    transportationCharges: "",
    weighmentSlip: "",
    transportingImage: "",
    leadTimeToDeliver: "",
    paymentType: "",
    advancePayment: "",
  });

  const filteredTasks = tasks.filter(
    (task) => user?.role === "admin" || task.nameOfIndenter === user?.name
  );

  const handleSentClick = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const [loadingTasks, setLoadingTasks] = useState(false);

  // console.log("selectedTask.taskNo", selectedTask?.taskNo);
  // console.log("tasks", tasks);
  const [searchTerm, setSearchTerm] = useState("");

  // const filteredTasks = tasks.length > 0 && tasks
  //   .filter(
  //     (task) => user?.role === "admin" || task.nameOfIndenter === user?.name
  //   )
  //   .filter(
  //     (task) =>
  //       task.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //       task.taskNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //       task.serialNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //       task.doerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //       task.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //       task.machinePartName.toLowerCase().includes(searchTerm.toLowerCase())
  //   );

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

      const formattedTasks = taskRows.map((row, index) => {
        // row is directly an array of values
        // Index is 0-based index in taskRows. 
        // taskRows starts at allRows[5] (Row 6).
        // So row index is index + 6.
        const rowIndex = index + 6;

        return {
          rowIndex: rowIndex,
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
          paymentType: row[25] || "",
          howMuch: row[26] || "",
        };
      });

      // console.log("Formatted Tasks:", formattedTasks);
      setTasks(formattedTasks);

      // Set pending tasks

      const pendingTasks = formattedTasks.filter((task) => task.actual === "");
      setPendingTasks(pendingTasks);

      // Set history tasks
      const historyTasks = formattedTasks.filter(
        (task) => task.actual !== "" && task.planned !== ""
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

  const uploadFileToDrive = async (file) => {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        const base64Data = reader.result;

        // console.log("base64Data", base64Data);
        // console.log("file.name", file.name);
        // console.log("file.type", file.type);
        // console.log("FOLDER_ID", FOLDER_ID);

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

          console.log("FileUploadData", data);

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
      setLoaderSubmit(true);

      let imageUrl = "";
      if (formData.transportingImage) {
        imageUrl = await uploadFileToDrive(formData.transportingImage);
      }

      const actualDate = new Date().toLocaleString("en-GB", {
        timeZone: "Asia/Kolkata",
      });
      // const actual1Date = new Date().toLocaleDateString("en-GB", {
      //   timeZone: "Asia/Kolkata",
      // });

      // Define fields to update with their column indices (1-based)
      // Index 17 (0-based) -> Column 18 (R)
      // Index 19 (0-based) -> Column 20 (T)
      const updates = [
        { colIndex: 18, value: actualDate }, // Actual (Col R)
        { colIndex: 20, value: formData.vendorName }, // Vendor Name (Col T)
        { colIndex: 21, value: formData.leadTimeToDeliver }, // Lead Time (Col U)
        { colIndex: 22, value: formData.transporterName }, // Transporter Name (Col V)
        { colIndex: 23, value: formData.transportationCharges }, // Transportation Charges (Col W)
        { colIndex: 24, value: formData.weighmentSlip }, // Weighment Slip (Col X)
        { colIndex: 25, value: imageUrl }, // Transporting Image (Col Y)
        { colIndex: 26, value: formData.paymentType }, // Payment Type (Col Z)
        { colIndex: 27, value: formData.paymentType === "Advance" ? formData.advancePayment : "" }, // How Much (Col AA)
      ];

      // Remove empty updates if needed, or send them to clear cells? 
      // User said "insert only input value". 
      // Safe to assume we want to update these specific fields regardless of whether they are empty (clearing them) or not.

      const updatePromises = updates.map(update => {
        // Skip if value is undefined, but allow empty strings (to clear)
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

      // Check if any failed
      const failed = results.find(r => !r.success);

      if (!failed) {
        alert("✅ Task updated successfully");
        setIsModalOpen(false);
        fetchAllTasks(); // refresh the table
      } else {
        console.error("Failed update result:", failed);
        alert("❌ Failed to update some fields: " + (failed.message || failed.error));
      }

    } catch (error) {
      console.error("Submit error:", error);
      alert("❌ Something went wrong while submitting");
    } finally {
      setLoaderSubmit(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Critical":
        return "bg-red-100 text-red-800";
      case "High":
        return "bg-orange-100 text-orange-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Sent Machine</h1>
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
            <div className="relative">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white">
                  <TableHead>Action</TableHead>
                  <TableHead>Task Number</TableHead>
                  <TableHead>Planned Date</TableHead>
                  <TableHead>Machine Name</TableHead>
                  <TableHead>Serial No</TableHead>
                  <TableHead>Indenter</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Part Name</TableHead>
                  <TableHead>Priority</TableHead>
                </TableHeader>
                <TableBody className="overflow-auto max-h-[calc(100vh-200px)] block">
                  {pendingTasks.map((task) => (
                    <TableRow key={task.taskNo}>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleSentClick(task)}
                          className="flex items-center"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Sent
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium text-blue-600">
                        {task.taskNo}
                      </TableCell>
                      <TableCell>
                        {new Date(task.taskStartDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{task.machineName}</TableCell>
                      <TableCell>{task.serialNo}</TableCell>
                      <TableCell>{task.doerName}</TableCell>
                      <TableCell>{task.department}</TableCell>
                      <TableCell>{task.machinePartName}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

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
                <TableHead>Planned Date</TableHead>
                <TableHead>Serial No</TableHead>
                <TableHead>Machine Name</TableHead>
                <TableHead>Indenter</TableHead>
                {/* to do */}

                <TableHead>Part Name</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Lead Time</TableHead>
                <TableHead>Transpoter Name</TableHead>
                <TableHead>Transportation Charges</TableHead>
                <TableHead>Weighment Slip</TableHead>
                <TableHead>Transporting Image With Machine</TableHead>
                <TableHead>Payment Type</TableHead>
                <TableHead>How Much</TableHead>

                <TableHead>Part Name</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Transporter</TableHead>
                <TableHead>Transportation Charges</TableHead>
              </TableHeader>
              <TableBody>
                {historyTasks.map((task) => (
                  <TableRow key={task.taskNo}>
                    <TableCell className="font-medium text-blue-600">
                      {task.taskNo}
                    </TableCell>
                    <TableCell>
                      {new Date(task.taskStartDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{task.serialNo}</TableCell>
                    <TableCell>{task.machineName}</TableCell>
                    <TableCell>{task.doerName}</TableCell>
                    {/* to do */}

                    <TableCell>{task.department}</TableCell>
                    <TableCell>{task.vendorName}</TableCell>
                    <TableCell>{task.leadTimeToDeliverDays}</TableCell>
                    <TableCell>{task.transporterName}</TableCell>
                    <TableCell>{task.transportationCharges}</TableCell>
                    <TableCell>{task.weighmentSlip}</TableCell>
                    <TableCell>
                      {task.transportingImageWithMachine ? (
                        <Button
                          size="sm"
                          variant="primary"

                          onClick={() =>
                            window.open(
                              task.transportingImageWithMachine,
                              "_blank"
                            )
                          }
                        >
                          View
                        </Button>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{task.paymentType}</TableCell>
                    <TableCell>{task.howMuch}</TableCell>

                    <TableCell>{task.machinePartName}</TableCell>
                    <TableCell>{task.vendorName || "-"}</TableCell>
                    <TableCell>{task.transporterName || "-"}</TableCell>
                    <TableCell>
                      ₹{task.transportationCharges?.toLocaleString() || "-"}
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
        title="Send Machine to Vendor"
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
                Vendor Name *
              </label>
              <input
                type="text"
                value={formData.vendorName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    vendorName: e.target.value,
                  }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transporter Name
              </label>
              <input
                type="text"
                value={formData.transporterName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    transporterName: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transportation Charges
              </label>
              <input
                type="number"
                value={formData.transportationCharges}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    transportationCharges: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weighment Slip
              </label>
              <input
                type="text"
                value={formData.weighmentSlip}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    weighmentSlip: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lead Time To Deliver ( In No. Of Days)
            </label>
            <input
              type="number"
              value={formData.leadTimeToDeliver}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  leadTimeToDeliver: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transporting Image With Machine
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  transportingImage: e.target.files[0],
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Add Payment Type dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Type *
            </label>
            <select
              value={formData.paymentType || ""}
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
              <option value="Advance">Advance</option>
              <option value="Full">Full</option>
              <option value="Warrenty/Garentie">Warrenty/Garentie</option>
            </select>
          </div>

          {/* Conditionally render Advance Payment input */}
          {formData.paymentType === "Advance" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Advance Payment Amount *
              </label>
              <input
                type="number"
                value={formData.advancePayment || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    advancePayment: e.target.value,
                  }))
                }
                required={formData.paymentType === "Advance"}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {loaderSubmit && <Loader2Icon className="animate-spin" />}
              Submit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SentMachine;
