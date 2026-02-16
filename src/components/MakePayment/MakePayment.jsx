import React, { useEffect, useState } from "react";
import { Search, Filter, Package } from "lucide-react";
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

const MakePayment = () => {
  const { user } = useAuth();
  const {
    repairPayments,
    pendingRepairPayments,
    historyRepairPayments,
    setRepairPayments,
    setPendingRepairPayments,
    setHistoryRepairPayments,
    addRepairPayment
  } = useDataStore();

  const [activeTab, setActiveTab] = useState("pending");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    totalBillAmount: "",
    paymentType: "",
    toBePaidAmount: "",
  });

  // const filteredTasks = tasks.filter(
  //   (task) => user?.role === "admin" || task.nameOfIndenter === user?.name
  // );



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
    try {
      setLoadingTasks(true);
      const SHEET_NAME_TASK = "Repair System";

      const res = await fetch(
        `${SCRIPT_URL}?sheet=${SHEET_NAME_TASK}`
      );
      const result = await res.json();

      const allRows = result?.data || [];
      const taskRows = allRows.slice(6);

      const formattedTasks = taskRows.map((row, index) => {
        // row is directly an array of values
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
          vendorName: row[19] || "",
          leadTimeToDeliverDays: row[20] || "",
          transporterName: row[21] || "",
          transportationCharges: row[22] || "",
          weighmentSlip: row[23] || "",
          transportingImageWithMachine: row[24] || "",
          paymentType: row[46] || row[25] || "",
          howMuch: row[26] || "",
          planned1: row[27] || "",
          actual1: row[28] || "",
          tranporterName: row[30] || "",
          billImage: row[32] || "",
          billNo: row[33] || "",
          typeOfBill: row[34] || "",
          totalBillAmount: row[35] || "",
          toBePaidAmount: row[47] || row[36] || "",
          planned2: row[37] || "",
          actual2: row[38] || "",
          delay2: row[39] || "",
          receivedQuantity: row[40] || "",
          billMatch: row[41] || "",
          productImage: row[42] || "",
          planned4: row[43] || "",
          actual4: row[44] || ""
        };
      });

      const pendingTasks = formattedTasks.filter(
        (task) => task.planned4 && !task.actual4
      );
      setPendingRepairPayments(pendingTasks);

      const historyTasks = formattedTasks.filter(
        (task) => task.actual4
      );
      setHistoryRepairPayments(historyTasks);

    } catch (err) {
      console.error("Error fetching tasks:", err);
      toast.error("Failed to fetch tasks");
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoadingTasks(true);
      const SHEET_NAME_PAYMENTS = "Repair FMS Advance Payment";

      const res = await fetch(
        `${SCRIPT_URL}?sheetId=${SHEET_Id}&&sheet=${SHEET_NAME_PAYMENTS}`
      );
      const result = await res.json();

      const allRows = result?.table?.rows || [];
      const paymentRows = allRows.slice(5);

      const formattedPayments = paymentRows.map((row) => {
        const cells = row.c;
        return {
          timestamp: cells[0]?.v || "",
          paymentNo: cells[1]?.v || "",
          repairTaskNo: cells[2]?.v || "",
          serialNo: cells[3]?.v || "",
          machineName: cells[4]?.v || "",
          vendorName: cells[5]?.v || "",
          billNo: cells[6]?.v || "",
          totalBillAmount: cells[7]?.v || "",
          paymentType: cells[8]?.v || "",
          toBePaidAmount: cells[9]?.v || "",
          // Add any additional columns you need
          // ...
        };
      });

      setRepairPayments(formattedPayments);
      setHistoryRepairPayments(formattedPayments);

    } catch (err) {
      console.error("Error fetching payments:", err);
      toast.error("Failed to fetch payment history");
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchAllTasks();
    // fetchPayments(); // Using Repair System for history
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      setSubmitLoading(true);
      const now = new Date();
      const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}, ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
      // Date for Actual 4 column
      const actual4Date = new Date().toLocaleDateString("en-GB", {
        timeZone: "Asia/Kolkata",
      });

      // 1. Generate Payment Number
      const lastPaymentNo = repairPayments
        .filter(payment => payment.paymentNo?.startsWith("PN-"))
        .map(payment => parseInt(payment.paymentNo.replace("PN-", ""), 10))
        .filter(num => !isNaN(num))
        .sort((a, b) => b - a)[0] || 0;

      const nextPaymentNo = `PN-${String(lastPaymentNo + 1).padStart(3, "0")}`;

      // 2. Prepare Payment Row Data (for Repair FMS Advance Payment)
      // Columns: Timestamp, Payment No, Task No, Serial No, Machine Name, Vendor Name, Bill No, Total Amount, Payment Type, To Be Paid
      const paymentRowData = [
        formattedDate,
        nextPaymentNo,
        selectedTask.taskNo,
        selectedTask.serialNo,
        selectedTask.machineName,
        selectedTask.vendorName || "",
        selectedTask.billNo,
        formData.totalBillAmount,
        formData.paymentType,
        formData.toBePaidAmount
      ];

      const insertPayload = {
        action: "insert",
        sheetName: "Repair FMS Advance Payment",
        rowData: JSON.stringify(paymentRowData)
      };

      // 3. Prepare Update Payload (for Repair System - Actual 4)
      const updates = [
        { colIndex: 45, value: actual4Date }, // Actual 4 (AS) - marks as done
        { colIndex: 47, value: formData.paymentType }, // Payment Type (AU)
        { colIndex: 48, value: formData.toBePaidAmount } // To Be Paid Amount (AV)
      ];

      // Execute Insert
      const insertReq = fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(insertPayload).toString(),
      }).then(res => res.json());

      // Execute Updates (Parallel)
      const updatePromises = updates.map(update => {
        if (update.value === undefined) return Promise.resolve({ success: true });

        return fetch(SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            action: "updateCell",
            sheetName: "Repair System",
            rowIndex: selectedTask.rowIndex,
            columnIndex: update.colIndex,
            value: update.value
          }).toString(),
        }).then(res => res.json());
      });

      const [insertResult, ...updateResults] = await Promise.all([insertReq, ...updatePromises]);

      const updateFailed = updateResults.find(r => !r.success);

      if (insertResult.success && !updateFailed) {
        toast.success("✅ Payment submitted successfully");

        // Optimistic UI updates
        const newPayment = {
          timestamp: formattedDate,
          paymentNo: nextPaymentNo,
          repairTaskNo: selectedTask.taskNo,
          serialNo: selectedTask.serialNo,
          machineName: selectedTask.machineName,
          vendorName: selectedTask.vendorName || "",
          billNo: selectedTask.billNo,
          totalBillAmount: formData.totalBillAmount,
          paymentType: formData.paymentType,
          toBePaidAmount: formData.toBePaidAmount,
          billMatch: "No"
        };
        addRepairPayment(newPayment);
        setHistoryRepairPayments([...historyRepairPayments, newPayment]);

        setIsModalOpen(false);
        fetchAllTasks();
        fetchPayments();
      } else {
        console.error("Submission failed", insertResult, updateFailed);
        toast.error("❌ Failed to submit data: " + (insertResult.message || "Update failed"));
      }

    } catch (error) {
      console.error("Submit error:", error);
      toast.error("❌ An error occurred while submitting");
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
              Pending ({pendingRepairPayments.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors duration-200 ${activeTab === "history"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              History ({historyRepairPayments.length})
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

        {/* {activeTab === "pending" && (
          <div>
          <Table>
            <TableHeader>
              <TableHead>Action</TableHead>
              <TableHead>Task Number</TableHead>
              <TableHead>Machine Name</TableHead>
              <TableHead>Vendor Name</TableHead>
              <TableHead>Bill No</TableHead>
              <TableHead>Total Bill Amount</TableHead>
              <TableHead>Payment Type</TableHead>
              <TableHead>To Be Paid Amount</TableHead>
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
                  <TableCell>{task.vendorName || "-"}</TableCell>
                  <TableCell>{task.billNo}</TableCell>
                  <TableCell>{task.totalBillAmount || "-"}</TableCell>
                  <TableCell>{task.paymentType || "-"}</TableCell>
                  <TableCell>{task.toBePaidAmount || "-"}</TableCell>
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
              <TableHead>Vendor Name</TableHead>
              <TableHead>Bill No</TableHead>
              <TableHead>Total Bill Amount</TableHead>
              <TableHead>Payment Type</TableHead>
              <TableHead>To Be Paid Amount</TableHead>
            </TableHeader>
            <TableBody>
              {historyTasks.map((task) => (
                <TableRow key={task.taskNo}>
                  <TableCell className="font-medium text-blue-600">
                    {task.taskNo}
                  </TableCell>
                  <TableCell>{task.machineName}</TableCell>
                  <TableCell>{task.vendorName || "-"}</TableCell>
                  <TableCell>{task.billNo}</TableCell>
                  <TableCell>{task.totalBillAmount || "-"}</TableCell>
                  <TableCell>{task.paymentType || "-"}</TableCell>
                  <TableCell>{task.toBePaidAmount || "-"}</TableCell>
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
        )} */}



        {activeTab === "pending" && (
          <div>
            <Table>
              <TableHeader>
                <TableHead>Action</TableHead>
                <TableHead>Task Number</TableHead>
                <TableHead>Machine Name</TableHead>
                <TableHead>Serial No</TableHead>

                {/* <TableHead>Planned Date</TableHead> */}
                <TableHead>Indenter</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Lead Time</TableHead>
                <TableHead>Payment Type</TableHead>
                <TableHead>Transpoter Amount</TableHead>
                <TableHead>Bill Image</TableHead>
                <TableHead>Bill No</TableHead>
                <TableHead>Total Bill Amount</TableHead>
                {/* <TableHead>To Be Paid</TableHead> */}
              </TableHeader>
              <TableBody>
                {pendingRepairPayments.map((task) => (
                  <TableRow key={task.taskNo}>
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
                      {task.taskNo}
                    </TableCell>
                    <TableCell>{task.machineName}</TableCell>
                    <TableCell>{task.serialNo}</TableCell>

                    {/* <TableCell>{task.planned2}</TableCell> */}
                    <TableCell>{task.doerName}</TableCell>
                    <TableCell>{task.vendorName || "-"}</TableCell>
                    <TableCell>{task.leadTimeToDeliverDays}</TableCell>
                    <TableCell>{task.paymentType || "-"}</TableCell>

                    <TableCell>{task.howMuch || "-"}</TableCell>

                    <TableCell>{task.billImage || "-"}</TableCell>
                    <TableCell>{task.billNo || "-"}</TableCell>
                    <TableCell>
                      ₹{task.totalBillAmount?.toLocaleString() || "-"}
                    </TableCell>
                    <TableCell>
                      {/* ₹{task.toBePaidAmount?.toLocaleString() || "-"} */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {loadingTasks && pendingRepairPayments.length === 0 && (
              <div className="flex flex-col items-center justify-center w-[75vw] mt-10">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600">Loading tasks...</p>
              </div>
            )}
            {!loadingTasks && pendingRepairPayments.length === 0 && (
              <div className="flex flex-col items-center justify-center w-[75vw] mt-10">
                <p className="mt-4 text-gray-600">No pending payments found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div>
            <Table>
              <TableHeader>
                {/* <TableHead>Payment No.</TableHead> */}
                <TableHead>Repair Task No.</TableHead>

                <TableHead>Serial No</TableHead>

                <TableHead>Machine Name</TableHead>
                <TableHead>Vendor Name</TableHead>

                <TableHead>Bill No.</TableHead>

                <TableHead>Total Bill Amount</TableHead>
                <TableHead>Payment Type</TableHead>
                <TableHead>To Be Paid Amount</TableHead>

                <TableHead>Bill Match</TableHead>
              </TableHeader>
              <TableBody>
                {historyRepairPayments.map((task, index) => (
                  <TableRow key={index}>
                    {/* <TableCell className="font-medium text-blue-600">
                      {task.paymentNo || "-"}
                    </TableCell> */}
                    <TableCell>{task.repairTaskNo || task.taskNo}</TableCell>
                    <TableCell>{task.serialNo}</TableCell>
                    <TableCell>{task.machineName}</TableCell>
                    <TableCell>{task.vendorName || "-"}</TableCell>
                    <TableCell>{task.billNo || "-"}</TableCell>

                    <TableCell>{task.totalBillAmount || "-"}</TableCell>
                    <TableCell>{task.paymentType || "-"}</TableCell>
                    <TableCell>{task.toBePaidAmount || "-"}</TableCell>


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

            {loadingTasks && historyRepairPayments.length === 0 && (
              <div className="flex flex-col items-center justify-center w-[75vw] mt-10">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600">Loading payment history...</p>
              </div>
            )}

            {!loadingTasks && historyRepairPayments.length === 0 && (
              <div className="flex flex-col items-center justify-center w-[75vw] mt-10">
                <p className="mt-4 text-gray-600">No payment history found</p>
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
                Payment No. (Read-only)
              </label>
              <input
                type="text"
                value={"PN-001" || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Serial No (Read-only)
              </label>
              <input
                type="text"
                value={selectedTask?.serialNo || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill No. (Read-only)
              </label>
              <input
                type="text"
                value={selectedTask?.billNo || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

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

export default MakePayment;
