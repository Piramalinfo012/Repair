import React, { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
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
import toast from "react-hot-toast";

const ServiceIndent = () => {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const SCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;
    const FOLDER_ID = import.meta.env.VITE_FOLDER_ID;

    const initialFormData = {
        serviceChecker: "",
        machineName: "",
        vendorName: "",
        workDescription: "",
        serviceLocation: "",
        billCopyImage: null,
        remarks: "",
        quotation: "",
        quotationImage: null,
        totalAmount: "",
        tdsDeductionAmount: "",
    };

    const [formData, setFormData] = useState(initialFormData);

    const serviceCheckerOptions = [
        "EA",
        "MIS",
    ];

    // Fetch tasks from sheet
    const fetchTasks = async () => {
        try {
            setLoadingTasks(true);
            const SHEET_NAME = "Service";

            const res = await fetch(`${SCRIPT_URL}?sheet=${SHEET_NAME}`);
            const result = await res.json();

            const allRows = result?.data || [];
            const taskRows = allRows.slice(6); // Skip header row

            const formattedTasks = taskRows.map((row) => ({
                serviceNo: row[1] || "",           // Column B (index 1)
                serviceChecker: row[2] || "",      // Column C (index 2)
                machineName: row[3] || "",
                vendorName: row[4] || "",          // Column E (index 4)
                workDescription: row[5] || "",     // Column F (index 5)
                serviceLocation: row[6] || "",     // Column G (index 6)
                billCopyImage: row[7] || "",       // Column H (index 7)
                remarks: row[8] || "",             // Column I (index 8)
                quotation: row[9] || "",           // Column J (index 9)
                quotationImage: row[10] || "",      // Column K (index 10)
                totalAmount: row[11] || "",        // Column L (index 11)
                tdsDeductionAmount: row[12] || "", // Column M (index 12)
            }));

            setTasks(formattedTasks);
        } catch (err) {
            console.error("Error fetching service indent tasks:", err);
            toast.error("Failed to fetch tasks");
        } finally {
            setLoadingTasks(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (files) {
            setFormData((prev) => ({ ...prev, [name]: files[0] }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    // Upload image to Google Drive
    const uploadImage = async (file) => {
        if (!file) return "";
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Upload images
            const billCopyUrl = await uploadImage(formData.billCopyImage);
            const quotationImageUrl = await uploadImage(formData.quotationImage);

            const now = new Date();
            const timestamp = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

            const quotationImgUrl = formData.quotation === "Yes" ? quotationImageUrl : "";

            const rowData = [
                timestamp,             // Column A - dd/mm/yyyy hh:mm:ss
                "",                    // Column B - Service No (auto or blank)
                formData.serviceChecker, // Column C
                formData.machineName,    // Column D
                formData.vendorName,   // Column E
                formData.workDescription, // Column F
                formData.serviceLocation, // Column G
                billCopyUrl,           // Column H
                formData.remarks,      // Column I
                formData.quotation,    // Column J
                quotationImgUrl,       // Column K
                formData.totalAmount,  // Column L
                formData.tdsDeductionAmount, // Column M
            ];

            const res = await fetch(SCRIPT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    action: "insert",
                    sheetName: "Service",
                    rowData: JSON.stringify(rowData),
                }).toString(),
            });

            const result = await res.json();

            if (result.success) {
                toast.success("Service Indent submitted successfully!");
                setFormData(initialFormData);
                setIsModalOpen(false);
                fetchTasks();
            } else {
                toast.error(result.message || "Submission failed");
            }
        } catch (err) {
            console.error("Submit error:", err);
            toast.error("Failed to submit");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredTasks = tasks.filter(
        (task) =>
            (task.vendorName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (task.serviceChecker || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (task.workDescription || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (task.serviceLocation || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Service Indent</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Manage service indent entries
                    </p>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Service Indent
                </Button>
            </div>

            {/* Search */}
            <div className="mb-4 flex items-center gap-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search by vendor, checker, description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
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
                        <TableHead>Quotation Image</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>TDS Deduction</TableHead>
                    </TableHeader>
                    <TableBody>
                        {loadingTasks ? (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center" style={{ textAlign: "center", padding: "60px 0" }}>
                                    <div className="flex flex-col items-center justify-center w-full">
                                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="mt-4 text-gray-600">Loading tasks...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredTasks.map((task, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium text-blue-600">{task.serviceNo || "-"}</TableCell>
                                <TableCell>{task.serviceChecker}</TableCell>
                                <TableCell>{task.machineName}</TableCell>
                                <TableCell>{task.vendorName}</TableCell>
                                <TableCell>{task.workDescription}</TableCell>
                                <TableCell>{task.serviceLocation}</TableCell>
                                <TableCell>
                                    {task.billCopyImage ? (
                                        <a
                                            href={task.billCopyImage}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline text-sm"
                                        >
                                            View
                                        </a>
                                    ) : "-"}
                                </TableCell>
                                <TableCell>{task.remarks || "-"}</TableCell>
                                <TableCell>{task.quotation || "-"}</TableCell>
                                <TableCell>
                                    {task.quotationImage ? (
                                        <a
                                            href={task.quotationImage}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline text-sm"
                                        >
                                            View
                                        </a>
                                    ) : "-"}
                                </TableCell>
                                <TableCell>{task.totalAmount || "-"}</TableCell>
                                <TableCell>{task.tdsDeductionAmount || "-"}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Modal Form */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="New Service Indent"
            >
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {/* Service Checker Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Service Checker <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="serviceChecker"
                            value={formData.serviceChecker}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select Service Checker</option>
                            {serviceCheckerOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Vendor Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Vendor Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="vendorName"
                            value={formData.vendorName}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter Vendor Name"
                        />
                    </div>

                    {/* Work Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Work Description
                        </label>
                        <textarea
                            name="workDescription"
                            value={formData.workDescription}
                            onChange={handleChange}
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Describe the work"
                        />
                    </div>

                    {/* Service Location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Service Location
                        </label>
                        <input
                            type="text"
                            name="serviceLocation"
                            value={formData.serviceLocation}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter Service Location"
                        />
                    </div>

                    {/* Bill Copy Image */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bill Copy Image
                        </label>
                        <input
                            type="file"
                            name="billCopyImage"
                            accept="image/*"
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>

                    {/* Remarks */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                        <textarea
                            name="remarks"
                            value={formData.remarks}
                            onChange={handleChange}
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter Remarks"
                        />
                    </div>

                    {/* Quotation - Yes/No */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quotation</label>
                        <select
                            name="quotation"
                            value={formData.quotation}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>

                    {/* Quotation Image - only shown when Quotation is Yes */}
                    {formData.quotation === "Yes" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quotation Image
                            </label>
                            <input
                                type="file"
                                name="quotationImage"
                                accept="image/*"
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>
                    )}

                    {/* Total Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total Amount
                        </label>
                        <input
                            type="number"
                            name="totalAmount"
                            value={formData.totalAmount}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter Total Amount"
                        />
                    </div>

                    {/* TDS Deduction Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            TDS Deduction Amount
                        </label>
                        <input
                            type="number"
                            name="tdsDeductionAmount"
                            value={formData.tdsDeductionAmount}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter TDS Deduction Amount"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {submitting ? "Submitting..." : "Submit"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ServiceIndent;
