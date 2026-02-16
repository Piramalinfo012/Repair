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

const ExternalPartsDetails = () => {
    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("pending");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const SCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;
    const FOLDER_ID = import.meta.env.VITE_FOLDER_ID;

    const initialActionForm = {
        partsName: "",
        amount: "",
        billCopy: null,
        remarks: "",
    };

    const [actionFormData, setActionFormData] = useState(initialActionForm);

    // Fetch tasks from Service sheet
    const fetchTasks = async () => {
        try {
            setLoadingTasks(true);
            const SHEET_NAME = "Service";

            const res = await fetch(`${SCRIPT_URL}?sheet=${SHEET_NAME}`);
            const result = await res.json();

            const allRows = result?.data || [];
            const taskRows = allRows.slice(6); // Skip header rows

            const formattedTasks = taskRows.map((row, index) => ({
                rowIndex: index + 7,
                serviceNo: row[1] || "",           // Column B (index 1)
                serviceChecker: row[2] || "",      // Column C (index 2)
                machineName: row[3] || "",
                vendorName: row[4] || "",          // Column E (index 4)
                workDescription: row[5] || "",     // Column F (index 5)
                serviceLocation: row[6] || "",     // Column G (index 6)
                billCopyImage: row[7] || "",       // Column H (index 7)
                remarks: row[8] || "",             // Column I (index 8)
                quotation: row[9] || "",           // Column J (index 9)
                quotationImage: row[10] || "",     // Column K (index 10)
                totalAmount: row[11] || "",        // Column L (index 11)
                tdsDeductionAmount: row[12] || "", // Column M (index 12)
                externalActual: row[14] || "",     // Column O (index 14)
                partsName: row[16] || "",          // Column Q (index 16)
                partsAmount: row[17] || "",        // Column R (index 17)
                partsBillCopy: row[18] || "",      // Column S (index 18)
                partsRemarks: row[19] || "",       // Column T (index 19)
            }));

            setTasks(formattedTasks);
        } catch (err) {
            console.error("Error fetching external parts tasks:", err);
            toast.error("Failed to fetch tasks");
        } finally {
            setLoadingTasks(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    // Upload image to Google Drive
    const uploadImage = async (file) => {
        if (!file) return "";
        const reader = new FileReader();
        return new Promise((resolve) => {
            reader.onload = async () => {
                try {
                    const base64 = reader.result.split(",")[1];
                    const res = await fetch(SCRIPT_URL, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: new URLSearchParams({
                            action: "uploadFile",
                            fileName: file.name,
                            mimeType: file.type,
                            base64Data: base64,
                            folderId: FOLDER_ID,
                        }).toString(),
                    });
                    const result = await res.json();
                    resolve(result.fileUrl || "");
                } catch (err) {
                    console.error("Image upload failed:", err);
                    resolve("");
                }
            };
            reader.onerror = () => resolve("");
            reader.readAsDataURL(file);
        });
    };

    const handleAction = (task) => {
        setSelectedTask(task);
        setActionFormData(initialActionForm);
        setIsModalOpen(true);
    };

    const handleActionFormChange = (e) => {
        const { name, value, files } = e.target;
        if (files) {
            setActionFormData((prev) => ({ ...prev, [name]: files[0] }));
        } else {
            setActionFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleActionSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTask) return;

        setSubmitting(true);
        try {
            const billCopyUrl = await uploadImage(actionFormData.billCopy);

            const now = new Date();
            const timestamp = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

            const updates = [
                { columnIndex: 15, value: timestamp },
                { columnIndex: 17, value: actionFormData.partsName },
                { columnIndex: 18, value: actionFormData.amount },
                { columnIndex: 19, value: billCopyUrl },
                { columnIndex: 20, value: actionFormData.remarks },
            ];

            for (const update of updates) {
                const res = await fetch(SCRIPT_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: new URLSearchParams({
                        action: "updateCell",
                        sheetName: "Service",
                        rowIndex: selectedTask.rowIndex.toString(),
                        columnIndex: update.columnIndex.toString(),
                        value: update.value,
                    }).toString(),
                });

                const result = await res.json();
                if (!result.success) {
                    throw new Error(result.error || "Failed to update cell");
                }
            }

            toast.success("External parts details submitted successfully!");
            setIsModalOpen(false);
            setActionFormData(initialActionForm);
            setSelectedTask(null);
            fetchTasks();
        } catch (err) {
            console.error("Submit error:", err);
            toast.error("Failed to submit details");
        } finally {
            setSubmitting(false);
        }
    };

    // Pending: Column O is empty, History: Column O has value
    const pendingTasks = tasks.filter((task) => !task.externalActual);
    const historyTasks = tasks.filter((task) => task.externalActual);

    const filterTasks = (taskList) =>
        taskList.filter(
            (task) =>
                (task.serviceNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (task.vendorName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (task.serviceChecker || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (task.workDescription || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (task.serviceLocation || "").toLowerCase().includes(searchTerm.toLowerCase())
        );

    const filteredPendingTasks = filterTasks(pendingTasks);
    const filteredHistoryTasks = filterTasks(historyTasks);

    const renderTableHeaders = (showAction) => (
        <TableHeader>
            {showAction && <TableHead>Action</TableHead>}
            <TableHead>Service No</TableHead>
            <TableHead>Service Checker</TableHead>
            <TableHead>Machine Name</TableHead>
            <TableHead>Vendor Name</TableHead>
            <TableHead>Work Description</TableHead>
            <TableHead>Service Location</TableHead>
            <TableHead>Bill Copy</TableHead>
            <TableHead>Remarks</TableHead>
            <TableHead>Quotation</TableHead>
            <TableHead>Quotation Image</TableHead>
            <TableHead>Total Amount</TableHead>
            <TableHead>TDS Deduction</TableHead>
            {!showAction && <TableHead>Parts Name</TableHead>}
            {!showAction && <TableHead>Parts Amount</TableHead>}
            {!showAction && <TableHead>Parts Bill</TableHead>}
            {!showAction && <TableHead>Parts Remarks</TableHead>}
        </TableHeader>
    );

    const renderTableRow = (task, index, showAction) => (
        <TableRow key={index}>
            {showAction && (
                <TableCell>
                    <Button
                        size="sm"
                        onClick={() => handleAction(task)}
                        className="text-xs px-3 py-1"
                    >
                        Action
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
            <TableCell>
                {task.quotationImage ? (
                    <a href={task.quotationImage} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">View</a>
                ) : "-"}
            </TableCell>
            <TableCell>{task.totalAmount || "-"}</TableCell>
            <TableCell>{task.tdsDeductionAmount || "-"}</TableCell>
            {!showAction && <TableCell>{task.partsName || "-"}</TableCell>}
            {!showAction && <TableCell>{task.partsAmount || "-"}</TableCell>}
            {!showAction && (
                <TableCell>
                    {task.partsBillCopy ? (
                        <a href={task.partsBillCopy} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">View</a>
                    ) : "-"}
                </TableCell>
            )}
            {!showAction && <TableCell>{task.partsRemarks || "-"}</TableCell>}
        </TableRow>
    );

    const colSpan = activeTab === "pending" ? 13 : 17;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">External Parts Details</h1>
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
                            {renderTableHeaders(true)}
                            <TableBody>
                                {loadingTasks ? (
                                    <TableRow>
                                        <TableCell colSpan={colSpan} className="text-center" style={{ textAlign: "center", padding: "60px 0" }}>
                                            <div className="flex flex-col items-center justify-center w-full">
                                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                <p className="mt-4 text-gray-600">Loading tasks...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredPendingTasks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={colSpan} className="text-center py-8">
                                            <p className="text-gray-500">No pending tasks found</p>
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
                            {renderTableHeaders(false)}
                            <TableBody>
                                {loadingTasks ? (
                                    <TableRow>
                                        <TableCell colSpan={colSpan} className="text-center" style={{ textAlign: "center", padding: "60px 0" }}>
                                            <div className="flex flex-col items-center justify-center w-full">
                                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                <p className="mt-4 text-gray-600">Loading tasks...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredHistoryTasks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={colSpan} className="text-center py-8">
                                            <p className="text-gray-500">No history found</p>
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

            {/* Action Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`External Parts - Service No: ${selectedTask?.serviceNo || "N/A"}`}
            >
                <form onSubmit={handleActionSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Parts Name</label>
                        <input type="text" name="partsName" value={actionFormData.partsName} onChange={handleActionFormChange} required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter parts name" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                        <input type="number" name="amount" value={actionFormData.amount} onChange={handleActionFormChange} required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter amount" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bill Copy</label>
                        <input type="file" name="billCopy" accept="image/*" onChange={handleActionFormChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                        <textarea name="remarks" value={actionFormData.remarks} onChange={handleActionFormChange} rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter remarks" />
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

export default ExternalPartsDetails;
