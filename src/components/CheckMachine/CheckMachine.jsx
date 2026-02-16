import React, { useEffect, useState } from "react";
import { Search, Filter, CheckCircle, Loader2Icon } from "lucide-react";
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
import useDataStore from "../../store/dataStore";
import toast from "react-hot-toast";

const CheckMachine = () => {
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
  const [loaderSubmit, setLoaderSubmit] = useState(false);

  const [formData, setFormData] = useState({
    billImage: null,
    billNo: "",
    typeOfBill: "",
    totalBillAmount: "",
    paymentType: "",
    toBePaidAmount: "",
    transporterName: "",
    transportationAmount: "",
  });

  const filteredTasks = repairTasks.filter(
    (task) => user?.role === "admin" || task.nameOfIndenter === user?.name
  );

  const handleMaterialClick = (task) => {
    setSelectedTask(task);
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

      // New backend returns simple 2D array in result.data
      const allRows = result?.data || [];
      const taskRows = allRows.slice(5);

      const formattedTasks = taskRows.map((row, index) => {
        // row is directly an array of values
        const rowIndex = index + 6;

        return {
          rowIndex: rowIndex,
          timestamp: row[0] || "",
          taskNo: row[1] || "",
          serialNo: row[2] || "",
          machineName: row[3] || "",
          // ... existing assignments
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
          planned1: row[27] || "",
          actual1: row[28] || "",
          tranporterName: row[30] || "",
          billImage: row[32] || "",
          billNo: row[33] || "",
          typeOfBill: row[34] || "",
          totalBillAmount: row[35] || "",
          toBePaidAmount: row[36] || "",
        };
      });

      setRepairTasks(formattedTasks);

      // Set pending tasks - where AB (planned1) is not empty and AC (actual1) is empty
      const pendingTasks = formattedTasks.filter(
        (task) => task.planned1 && !task.actual1
      );
      setPendingRepairTasks(pendingTasks);

      // Set history tasks - where both AB (planned1) and AC (actual1) are not empty
      const historyTasks = formattedTasks.filter(
        (task) => task.planned1 && task.actual1
      );
      setHistoryRepairTasks(historyTasks);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      toast.error("Failed to fetch tasks");
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
      setLoaderSubmit(true);
      let billImageUrl = "";
      if (formData.billImage) {
        billImageUrl = await uploadFileToDrive(formData.billImage);
      }

      // Use Update Cell to avoid overwriting other columns
      // Mapping based on flow:
      // Index 28 (AC) -> Actual 1 (Date)
      // Index 30 (AE) -> Transporter Name
      // Index 31 (AF) -> Transportation Amount
      // Index 32 (AG) -> Bill Image
      // Index 33 (AH) -> Bill No
      // Index 34 (AI) -> Type of Bill
      // Index 35 (AJ) -> Total Bill Amount
      // Index 36 (AK) -> To Be Paid Amount

      const actual1Date = new Date().toLocaleDateString("en-GB", {
        timeZone: "Asia/Kolkata",
      });

      // Calculate To Be Paid Amount
      let toBePaidAmountValue = "";
      if (selectedTask?.howMuch != null && formData.totalBillAmount) {
        const calculated = parseFloat(formData.totalBillAmount) - parseFloat(selectedTask.howMuch);
        if (calculated >= 0) {
          toBePaidAmountValue = calculated;
        }
      }

      const updates = [
        { colIndex: 29, value: actual1Date },
        { colIndex: 31, value: formData.transporterName },
        { colIndex: 32, value: formData.transportationAmount },
        { colIndex: 33, value: billImageUrl },
        { colIndex: 34, value: formData.billNo },
        { colIndex: 35, value: formData.typeOfBill },
        { colIndex: 36, value: formData.totalBillAmount },
        { colIndex: 37, value: toBePaidAmountValue },
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
        // Update the Zustand store locally to reflect changes immediately
        updateRepairTask(selectedTask.taskNo, {
          actual1: actual1Date,
          tranporterName: formData.transporterName, // Note: State uses 'tranporterName' matching fetch map
          // Add other fields to store if needed, mostly for UI update
        });

        toast.success("✅ Task updated successfully");
        setIsModalOpen(false);
        fetchAllTasks(); // refresh the table
      } else {
        toast.error("❌ Failed to update task: " + (failed.message || failed.error));
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("❌ Something went wrong while submitting");
    } finally {
      setLoaderSubmit(false);
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Check Machine</h1>
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
              Pending ({pendingRepairTasks.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors duration-200 ${activeTab === "history"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              History ({historyRepairTasks.length})
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

                <TableHead>Planned Date</TableHead>

                <TableHead>Serial No</TableHead>
                <TableHead>Indenter</TableHead>

                <TableHead>Vendor</TableHead>
                <TableHead>Transpoter Charges</TableHead>
                <TableHead>Lead Time</TableHead>
                <TableHead>Payment Type</TableHead>
                <TableHead>How Much</TableHead>
              </TableHeader>
              <TableBody>
                {pendingRepairTasks.map((task) => (
                  <TableRow key={task.taskNo}>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleMaterialClick(task)}
                        className="flex items-center"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Material
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium text-blue-600">
                      {task.taskNo}
                    </TableCell>
                    <TableCell>{task.machineName}</TableCell>

                    <TableCell>{task.planned1}</TableCell>

                    <TableCell>{task.serialNo}</TableCell>
                    <TableCell>{task.doerName}</TableCell>
                    <TableCell>{task.vendorName || "-"}</TableCell>
                    <TableCell>{task.transportationCharges}</TableCell>
                    <TableCell>{task.leadTimeToDeliverDays}</TableCell>
                    <TableCell>{task.paymentType || "-"}</TableCell>
                    <TableCell>{task.howMuch || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {loadingTasks && pendingRepairTasks.length === 0 && (
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

                <TableHead>Serial No</TableHead>
                <TableHead>Planned Date</TableHead>
                <TableHead>Indenter</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Lead Time</TableHead>
                <TableHead>Payment Type</TableHead>
                <TableHead>How Much</TableHead>
                <TableHead>Transporter Name</TableHead>


                <TableHead>Total Amount</TableHead>
                <TableHead>Bill No</TableHead>
                <TableHead>Bill Type</TableHead>
                <TableHead>To Be Paid</TableHead>
                <TableHead>Bill Image</TableHead>
              </TableHeader>
              <TableBody>
                {historyRepairTasks.map((task) => (
                  <TableRow key={task.taskNo}>
                    <TableCell className="font-medium text-blue-600">
                      {task.taskNo}
                    </TableCell>
                    <TableCell>{task.machineName}</TableCell>
                    <TableCell>{task.serialNo}</TableCell>
                    <TableCell>{task.planned1}</TableCell>
                    <TableCell>{task.doerName}</TableCell>
                    <TableCell>{task.vendorName || "-"}</TableCell>
                    <TableCell>{task.leadTimeToDeliverDays}</TableCell>
                    <TableCell>{task.paymentType || "-"}</TableCell>
                    <TableCell>{task.howMuch || "-"}</TableCell>
                    <TableCell>{task.tranporterName || "-"}</TableCell>
                    <TableCell>
                      ₹{task.toBePaidAmount?.toLocaleString() || "-"}
                    </TableCell>

                    <TableCell>{task.billNo || "-"}</TableCell>
                    <TableCell>{task.typeOfBill || "-"}</TableCell>

                    <TableCell>
                      ₹{task.totalBillAmount?.toLocaleString() || "-"}
                    </TableCell>

                    <TableCell>
                      {task.billImage ? (
                        <Button
                          size="sm"
                          variant="primary"

                          onClick={() =>
                            window.open(
                              task.billImage,
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

                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {loadingTasks && historyRepairTasks.length === 0 && (
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
        title="Check Material Details"
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

            {/* Existing fields... */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Type (Read-only)
              </label>
              <input
                type="text"
                value={selectedTask?.paymentType || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>

            {/* ONLY show this field if paymentType is "Advance" */}
            {selectedTask?.paymentType === "Advance" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How Much (Advance Amount)
                </label>
                <input
                  type="text"
                  value={selectedTask?.howMuch || ""}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transporter Name *
              </label>
              <input
                type="text"
                value={formData.transporterName || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    transporterName: e.target.value,
                  }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transportation Amount *
              </label>
              <input
                type="number"
                value={formData.transportationAmount || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    transportationAmount: e.target.value,
                  }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill No. *
              </label>
              <input
                type="text"
                value={formData.billNo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, billNo: e.target.value }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type of Bill *
              </label>
              <select
                value={formData.typeOfBill}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    typeOfBill: e.target.value,
                  }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Bill Type</option>
                <option value="Service Bill">Service Bill</option>
                <option value="Material Bill">Material Bill</option>
                <option value="Labor Bill">Labor Bill</option>
                <option value="Combined Bill">Combined Bill</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Bill Amount *
              </label>
              <input
                type="number"
                value={formData.totalBillAmount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    totalBillAmount: e.target.value,
                  }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Image *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    billImage: e.target.files[0],
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* <div>
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
            </div> */}

            {formData.totalBillAmount && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Be Paid Amount
                </label>
                <input
                  type="number"
                  value={
                    selectedTask?.howMuch != null &&
                      formData.totalBillAmount - selectedTask.howMuch >= 0
                      ? formData.totalBillAmount - selectedTask.howMuch
                      : ""
                  }
                  readOnly
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none"
                />
              </div>
            )}

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
              {loaderSubmit && <Loader2Icon className="animate-spin" />}
              Submit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CheckMachine;
