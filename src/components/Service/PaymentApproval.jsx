import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
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
import toast from "react-hot-toast";

const PaymentApproval = () => {
    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("pending");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [approvalStatus, setApprovalStatus] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const SCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;

    // Fetch tasks from Service sheet
    const fetchTasks = async () => {
        try {
            setLoadingTasks(true);
            const SHEET_NAME = "Service";

            const res = await fetch(`${SCRIPT_URL}?sheet=${SHEET_NAME}`);
            const result = await res.json();

            const allRows = result?.data || [];
            const taskRows = allRows.slice(6);

            const formattedTasks = taskRows.map((row, index) => ({
                rowIndex: index + 7,
                serviceNo: row[1] || "",
                serviceChecker: row[2] || "",
                machineName: row[3] || "",
                vendorName: row[4] || "",
                workDescription: row[5] || "",
                serviceLocation: row[6] || "",
                billCopyImage: row[7] || "",
                remarks: row[8] || "",
                quotation: row[9] || "",
                quotationImage: row[10] || "",
                totalAmount: row[11] || "",
                tdsDeductionAmount: row[12] || "",
                externalActual: row[14] || "",     // Column O (index 14)
                partsName: row[16] || "",          // Column Q (index 16)
                partsAmount: row[17] || "",        // Column R (index 17)
                partsBillCopy: row[18] || "",      // Column S (index 18)
                partsRemarks: row[19] || "",       // Column T (index 19)
                paymentApproval: row[20] || "",    // Column U (index 20) - payment approval status
                tallyEntry: row[21] || "",         // Column V (index 21) - tally entry status
                approvalStatusValue: row[23] || "", // Column X (index 23) - approval status
            }));

            setTasks(formattedTasks);
        } catch (err) {
            console.error("Error fetching payment approval tasks:", err);
            toast.error("Failed to fetch tasks");
        } finally {
            setLoadingTasks(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleOpenModal = (task) => {
        setSelectedTask(task);
        setApprovalStatus("");
        setIsModalOpen(true);
    };

    const handleApproveSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTask || !approvalStatus) {
            toast.error("Please select a status");
            return;
        }

        setSubmitting(true);
        try {
            const now = new Date();
            const timestamp = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

            // Column V (index 21 → 1-based: 22) - timestamp
            const res1 = await fetch(SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    action: "updateCell",
                    sheetName: "Service",
                    rowIndex: selectedTask.rowIndex.toString(),
                    columnIndex: "22",
                    value: timestamp,
                }).toString(),
            });
            const result1 = await res1.json();
            if (!result1.success) throw new Error("Failed to update timestamp");

            // Column X (index 23 → 1-based: 24) - status
            const res2 = await fetch(SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    action: "updateCell",
                    sheetName: "Service",
                    rowIndex: selectedTask.rowIndex.toString(),
                    columnIndex: "24",
                    value: approvalStatus,
                }).toString(),
            });
            const result2 = await res2.json();
            if (!result2.success) throw new Error("Failed to update status");

            toast.success(`Payment ${approvalStatus.toLowerCase()} successfully!`);
            setIsModalOpen(false);
            setSelectedTask(null);
            setApprovalStatus("");
            fetchTasks();
        } catch (err) {
            console.error("Approve error:", err);
            toast.error("Failed to submit approval");
        } finally {
            setSubmitting(false);
        }
    };

    // Pending: Column U not null AND Column V null. History: both not null.
    const pendingTasks = tasks.filter((task) => task.paymentApproval && !task.tallyEntry);
    const historyTasks = tasks.filter((task) => task.paymentApproval && task.tallyEntry);

    const filterTasks = (taskList) =>
        taskList.filter(
            (task) =>
                (task.serviceNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (task.vendorName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (task.serviceChecker || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (task.workDescription || "").toLowerCase().includes(searchTerm.toLowerCase())
        );

    const filteredPendingTasks = filterTasks(pendingTasks);
    const filteredHistoryTasks = filterTasks(historyTasks);

    const renderTableRow = (task, index, showAction) => (
        <TableRow key={index}>
            {showAction && (
                <TableCell>
                    <Button
                        size="sm"
                        onClick={() => handleOpenModal(task)}
                        className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700"
                    >
                        Approve
                    </Button>
                </TableCell>
            )}
            <TableCell className="font-medium text-blue-600">{task.serviceNo || "-"}</TableCell>
            <TableCell>{task.serviceChecker}</TableCell>
            <TableCell>{task.machineName}</TableCell>
            <TableCell>{task.vendorName}</TableCell>
            <TableCell>{task.workDescription}</TableCell>
            <TableCell>{task.serviceLocation}</TableCell>
            <TableCell>
                {task.billCopyImage ? (
                    <a href={task.billCopyImage} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">View</a>
                ) : "-"}
            </TableCell>
            <TableCell>{task.remarks || "-"}</TableCell>
            <TableCell>{task.quotation || "-"}</TableCell>
            <TableCell>{task.totalAmount || "-"}</TableCell>
            <TableCell>{task.tdsDeductionAmount || "-"}</TableCell>
            <TableCell>{task.partsName || "-"}</TableCell>
            <TableCell>{task.partsAmount || "-"}</TableCell>
            <TableCell>
                {task.partsBillCopy ? (
                    <a href={task.partsBillCopy} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">View</a>
                ) : "-"}
            </TableCell>
            <TableCell>{task.partsRemarks || "-"}</TableCell>
            {!showAction && <TableCell>{task.approvalStatusValue || "-"}</TableCell>}
        </TableRow>
    );

    const pendingColSpan = 16;
    const historyColSpan = 17;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Payment Approval</h1>
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
                                placeholder="Search by vendor, checker, description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Pending Tab */}
                {activeTab === "pending" && (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableHead>Action</TableHead>
                                <TableHead>Service No</TableHead>
                                <TableHead>Service Checker</TableHead>
                                <TableHead>Machine Name</TableHead>
                                <TableHead>Vendor Name</TableHead>
                                <TableHead>Work Description</TableHead>
                                <TableHead>Service Location</TableHead>
                                <TableHead>Bill Copy</TableHead>
                                <TableHead>Remarks</TableHead>
                                <TableHead>Quotation</TableHead>
                                <TableHead>Total Amount</TableHead>
                                <TableHead>TDS Deduction</TableHead>
                                <TableHead>Parts Name</TableHead>
                                <TableHead>Parts Amount</TableHead>
                                <TableHead>Parts Bill</TableHead>
                                <TableHead>Parts Remarks</TableHead>
                            </TableHeader>
                            <TableBody>
                                {loadingTasks ? (
                                    <TableRow>
                                        <TableCell colSpan={pendingColSpan} className="text-center" style={{ textAlign: "center", padding: "60px 0" }}>
                                            <div className="flex flex-col items-center justify-center w-full">
                                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                <p className="mt-4 text-gray-600">Loading tasks...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredPendingTasks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={pendingColSpan} className="text-center py-8">
                                            <p className="text-gray-500">No pending approvals</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredPendingTasks.map((task, index) => renderTableRow(task, index, true))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* History Tab */}
                {activeTab === "history" && (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableHead>Service No</TableHead>
                                <TableHead>Service Checker</TableHead>
                                <TableHead>Machine Name</TableHead>
                                <TableHead>Vendor Name</TableHead>
                                <TableHead>Work Description</TableHead>
                                <TableHead>Service Location</TableHead>
                                <TableHead>Bill Copy</TableHead>
                                <TableHead>Remarks</TableHead>
                                <TableHead>Quotation</TableHead>
                                <TableHead>Total Amount</TableHead>
                                <TableHead>TDS Deduction</TableHead>
                                <TableHead>Parts Name</TableHead>
                                <TableHead>Parts Amount</TableHead>
                                <TableHead>Parts Bill</TableHead>
                                <TableHead>Parts Remarks</TableHead>
                                <TableHead>Approved On</TableHead>
                            </TableHeader>
                            <TableBody>
                                {loadingTasks ? (
                                    <TableRow>
                                        <TableCell colSpan={historyColSpan} className="text-center" style={{ textAlign: "center", padding: "60px 0" }}>
                                            <div className="flex flex-col items-center justify-center w-full">
                                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                <p className="mt-4 text-gray-600">Loading tasks...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredHistoryTasks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={historyColSpan} className="text-center py-8">
                                            <p className="text-gray-500">No approval history</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredHistoryTasks.map((task, index) => renderTableRow(task, index, false))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Approval Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`Payment Approval - Service No: ${selectedTask?.serviceNo || "N/A"}`}
            >
                <form onSubmit={handleApproveSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={approvalStatus}
                            onChange={(e) => setApprovalStatus(e.target.value)}
                            required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select Status</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit"}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default PaymentApproval;
