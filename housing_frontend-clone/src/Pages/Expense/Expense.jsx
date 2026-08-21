import React, { useState, useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import {
    FaPlus,
    FaSearch,
    FaEye,
    FaEdit,
    FaTrash,
    FaTimes,
    FaRupeeSign,
    FaCalendarAlt,
    FaFileInvoice,
    FaUser,
    FaBuilding,
    FaPhone,
    FaFilePdf,
    FaFileImage,
    FaFileExcel,
    FaDownload,
    FaUpload,
    FaSpinner,
    FaCheckCircle,
    FaExclamationTriangle,
    FaHistory,
    FaFilter,
    FaFile
} from "react-icons/fa";
import Navbar from "../../Components/Sidebar/Navbar";
import "./Expense.scss";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from 'xlsx';

const Expense = () => {
    const [expenses, setExpenses] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [expenseToUpdate, setExpenseToUpdate] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    // Filter states
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategory, setFilterCategory] = useState("ALL");
    const [filterPaymentStatus, setFilterPaymentStatus] = useState("ALL");
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");

    // File upload state
    const [uploadedFile, setUploadedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [updateUploadedFile, setUpdateUploadedFile] = useState(null);
    const [updateFilePreview, setUpdateFilePreview] = useState(null);

    /* ================= CATEGORY OPTIONS ================= */
    const categoryOptions = [
        { value: "ELECTRICITY", label: "Electricity" },
        { value: "WATER", label: "Water" },
        { value: "MAINTENANCE", label: "Maintenance" },
        { value: "SECURITY", label: "Security" },
        { value: "HOUSEKEEPING", label: "Housekeeping" },
        { value: "REPAIRS", label: "Repairs" },
        { value: "OFFICE_ADMIN", label: "Office / Admin" },
        { value: "FESTIVAL_EVENT", label: "Festival / Event" },
        { value: "OTHER", label: "Other" },
    ];

    const paymentModeOptions = [
        { value: "CASH", label: "Cash" },
        { value: "BANK_TRANSFER", label: "Bank Transfer" },
        { value: "CHEQUE", label: "Cheque" },
        { value: "UPI", label: "UPI" },
    ];

    const paymentStatusOptions = [
        { value: "PAID", label: "Paid" },
        { value: "PENDING", label: "Pending" },
    ];

    const vendorTypeOptions = [
        { value: "INDIVIDUAL", label: "Individual" },
        { value: "COMPANY", label: "Company / Service Provider" },
    ];

    /* ================= FETCH EXPENSES ================= */
    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${import.meta.env.VITE_API_URL}/expense/get-all`);
            const data = await res.json();
            setExpenses(data);
        } catch {
            toast.error("Failed to fetch expenses");
        } finally {
            setIsLoading(false);
        }
    };

    /* ================= FORM INITIAL VALUES ================= */
    const initialValues = {
        dateFrom: new Date().toISOString().split("T")[0],
        dateTo: new Date().toISOString().split("T")[0],
        category: "",
        customCategory: "",
        description: "",
        amount: "",
        paymentMode: "",
        paymentStatus: "PENDING",
        vendorName: "",
        vendorType: "",
        vendorContact: "",
        document: null,
    };

    const validationSchema = Yup.object({
        dateFrom: Yup.date().required("From date is required"),
        dateTo: Yup.date()
            .required("To date is required")
            .min(Yup.ref('dateFrom'), "To date cannot be before From date"),
        category: Yup.string().required("Category is required"),
        customCategory: Yup.string()
            .when('category', {
                is: 'OTHER',
                then: (schema) => schema.required("Custom category is required"),
                otherwise: (schema) => schema.notRequired(),
            }),
        description: Yup.string().required("Description is required"),
        amount: Yup.number()
            .required("Amount is required")
            .positive("Amount must be positive")
            .typeError("Amount must be a number"),
        paymentMode: Yup.string().required("Payment mode is required"),
        paymentStatus: Yup.string().required("Payment status is required"),
        vendorName: Yup.string().required("Vendor name is required"),
        vendorType: Yup.string().required("Vendor type is required"),
        vendorContact: Yup.string(),
    });

    /* ================= HANDLE FILE UPLOAD ================= */
    const handleFileChange = (e, setFile, setPreview) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Only PDF, JPG, PNG, and GIF files are allowed");
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast.error("File size must be less than 10MB");
            return;
        }

        setFile(file);

        // Create preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }
    };

    /* ================= CREATE EXPENSE ================= */
    const handleSubmit = async (values, { resetForm }) => {
        try {
            setIsSubmitting(true);

            const formData = new FormData();
            formData.append('dateFrom', values.dateFrom);
            formData.append('dateTo', values.dateTo);
            formData.append('category', values.category);
            formData.append('customCategory', values.customCategory);
            formData.append('description', values.description);
            formData.append('amount', values.amount);
            formData.append('paymentMode', values.paymentMode);
            formData.append('paymentStatus', values.paymentStatus);
            formData.append('vendorName', values.vendorName);
            formData.append('vendorType', values.vendorType);
            formData.append('vendorContact', values.vendorContact || '');

            if (uploadedFile) {
                formData.append('document', uploadedFile);
            }

            const res = await fetch(`${import.meta.env.VITE_API_URL}/expense/create`, {
                method: 'POST',
                body: formData,
            });

            const result = await res.json();

            if (res.ok && result.success) {
                toast.success("Expense created successfully!");
                setExpenses(prev => [result.data, ...prev]);
                resetForm();
                setShowForm(false);
                setUploadedFile(null);
                setFilePreview(null);
            } else {
                throw new Error(result.message || "Failed to create expense");
            }
        } catch (error) {
            console.error("❌ Create error:", error);
            toast.error(error.message || "Failed to create expense");
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ================= UPDATE EXPENSE ================= */
    const handleUpdateExpense = async (values) => {
        if (!expenseToUpdate) return;

        try {
            setIsUpdating(true);

            const formData = new FormData();
            formData.append('dateFrom', values.dateFrom);
            formData.append('dateTo', values.dateTo);
            formData.append('category', values.category);
            formData.append('customCategory', values.customCategory);
            formData.append('description', values.description);
            formData.append('amount', values.amount);
            formData.append('paymentMode', values.paymentMode);
            formData.append('paymentStatus', values.paymentStatus);
            formData.append('vendorName', values.vendorName);
            formData.append('vendorType', values.vendorType);
            formData.append('vendorContact', values.vendorContact || '');
            formData.append('updateReason', values.updateReason || 'Manual update');

            if (values.removeDocument) {
                formData.append('removeDocument', 'true');
            } else if (updateUploadedFile) {
                formData.append('document', updateUploadedFile);
            }

            const res = await fetch(`${import.meta.env.VITE_API_URL}/expense/update/${expenseToUpdate.expenseId}`, {
                method: 'PUT',
                body: formData,
            });

            const result = await res.json();

            if (res.ok && result.success) {
                toast.success("Expense updated successfully!");

                // Update in state
                setExpenses(prev =>
                    prev.map(exp =>
                        exp.expenseId === expenseToUpdate.expenseId
                            ? result.data.expense
                            : exp
                    )
                );

                if (selectedExpense?.expenseId === expenseToUpdate.expenseId) {
                    setSelectedExpense(result.data.expense);
                }

                setShowUpdateModal(false);
                setExpenseToUpdate(null);
                setUpdateUploadedFile(null);
                setUpdateFilePreview(null);
            } else {
                throw new Error(result.message || "Failed to update expense");
            }
        } catch (error) {
            console.error("❌ Update error:", error);
            toast.error(error.message || "Failed to update expense");
        } finally {
            setIsUpdating(false);
        }
    };

    /* ================= DELETE EXPENSE ================= */
    const handleDeleteExpense = async () => {
        if (!expenseToDelete) return;

        try {
            setIsDeleting(true);
            const res = await fetch(`${import.meta.env.VITE_API_URL}/expense/delete/${expenseToDelete.expenseId}`, {
                method: 'DELETE',
            });

            const result = await res.json();

            if (res.ok && result.success) {
                toast.success("Expense deleted successfully!");
                setExpenses(prev => prev.filter(exp => exp.expenseId !== expenseToDelete.expenseId));

                if (selectedExpense?.expenseId === expenseToDelete.expenseId) {
                    setSelectedExpense(null);
                }

                setShowDeleteConfirm(false);
                setExpenseToDelete(null);
            } else {
                throw new Error(result.message || "Failed to delete expense");
            }
        } catch (error) {
            console.error("❌ Delete error:", error);
            toast.error(error.message || "Failed to delete expense");
        } finally {
            setIsDeleting(false);
        }
    };

    /* ================= FILTER EXPENSES ================= */
    const getFilteredExpenses = () => {
        let filtered = expenses.filter(expense => {
            // Search filter
            const searchMatch = searchTerm === "" ||
                expense.expenseNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                expense.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                expense.vendorContact?.toLowerCase().includes(searchTerm.toLowerCase());

            // Category filter
            const categoryMatch = filterCategory === "ALL" || expense.category === filterCategory;

            // Payment status filter
            const statusMatch = filterPaymentStatus === "ALL" || expense.paymentStatus === filterPaymentStatus;

            // Date range filter
            let dateMatch = true;
            if (filterDateFrom || filterDateTo) {
                const expenseDate = new Date(expense.dateFrom);
                if (filterDateFrom && expenseDate < new Date(filterDateFrom)) {
                    dateMatch = false;
                }
                if (filterDateTo && expenseDate > new Date(filterDateTo)) {
                    dateMatch = false;
                }
            }

            return searchMatch && categoryMatch && statusMatch && dateMatch;
        });

        return filtered;
    };

    const filteredExpenses = getFilteredExpenses();

    /* ================= EXPORT TO EXCEL ================= */
    const exportToExcel = () => {
        if (filteredExpenses.length === 0) {
            toast.warning("No expenses to export!");
            return;
        }

        setIsExporting(true);

        try {
            const excelData = filteredExpenses.map((expense, index) => ({
                'S.No': index + 1,
                'Expense No': expense.expenseNo,
                'From Date': new Date(expense.dateFrom).toLocaleDateString('en-GB'),
                'To Date': new Date(expense.dateTo).toLocaleDateString('en-GB'),
                'Category': categoryOptions.find(c => c.value === expense.category)
                    ? categoryOptions.find(c => c.value === expense.category).label
                    : expense.category, // Show custom category directly
                'Description': expense.description,
                'Amount': expense.amount,
                'Payment Mode': paymentModeOptions.find(p => p.value === expense.paymentMode)?.label || expense.paymentMode,
                'Payment Status': expense.paymentStatus,
                'Vendor Name': expense.vendorName,
                'Vendor Type': vendorTypeOptions.find(v => v.value === expense.vendorType)?.label || expense.vendorType,
                'Vendor Contact': expense.vendorContact || '-',
                'Document': expense.documentFileName ? 'Yes' : 'No',
                'Created Date': new Date(expense.createdAt).toLocaleString('en-GB'),
                'Last Updated': expense.lastUpdated ?
                    new Date(expense.lastUpdated).toLocaleString('en-GB') : '-',
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);

            const colWidths = [
                { wch: 5 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
                { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 15 },
                { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 20 },
                { wch: 10 }, { wch: 20 }, { wch: 20 }
            ];
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, "Expenses");

            let fileName = `Expenses_${new Date().toISOString().split('T')[0]}`;
            if (filterCategory !== "ALL") fileName += `_${filterCategory}`;
            if (filterPaymentStatus !== "ALL") fileName += `_${filterPaymentStatus}`;
            fileName += '.xlsx';

            XLSX.writeFile(wb, fileName);
            toast.success(`Exported ${filteredExpenses.length} expenses!`);

        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to export");
        } finally {
            setIsExporting(false);
        }
    };

    /* ================= CLEAR FILTERS ================= */
    const clearFilters = () => {
        setSearchTerm("");
        setFilterCategory("ALL");
        setFilterPaymentStatus("ALL");
        setFilterDateFrom("");
        setFilterDateTo("");
    };

    /* ================= DOCUMENT PREVIEW ================= */
    const openDocument = (expense) => {
        if (!expense.documentUrl) {
            toast.warning("No document available");
            return;
        }

        const url = `${import.meta.env.VITE_API_URL}${expense.documentUrl}`;
        window.open(url, "_blank");
    };

    /* ================= UPDATE MODAL ================= */
    const UpdateModal = ({ expense }) => {
        const [formValues, setFormValues] = useState({
            dateFrom: expense.dateFrom ? new Date(expense.dateFrom).toISOString().split("T")[0] : "",
            dateTo: expense.dateTo ? new Date(expense.dateTo).toISOString().split("T")[0] : "",
            category: expense.category,
            customCategory: expense.customCategory || "",
            description: expense.description,
            amount: expense.amount,
            paymentMode: expense.paymentMode,
            paymentStatus: expense.paymentStatus,
            vendorName: expense.vendorName,
            vendorType: expense.vendorType,
            vendorContact: expense.vendorContact || "",
            updateReason: "",
            removeDocument: false,
        });

        return (
            <div className="modal-overlay update-overlay" onClick={() => setShowUpdateModal(false)}>
                <div className="modal-content update-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3 className="modal-title">
                            <FaEdit /> Update Expense - {expense.expenseNo}
                        </h3>
                        <button className="close-btn" onClick={() => setShowUpdateModal(false)}>×</button>
                    </div>

                    <div className="modal-body">
                        <Formik
                            initialValues={formValues}
                            validationSchema={validationSchema}
                            onSubmit={handleUpdateExpense}
                        >
                            {({ values, setFieldValue }) => (
                                <Form>
                                    {/* CURRENT DOCUMENT */}
                                    {expense.documentFileName && (
                                        <div className="current-document">
                                            <h4>
                                                <FaFileInvoice /> Current Document
                                            </h4>
                                            <div className="document-info">
                                                <div className="document-preview">
                                                    {expense.documentMimeType?.startsWith('image/') ? (
                                                        <img
                                                            src={`${import.meta.env.VITE_API_URL}${expense.documentUrl}`}
                                                            alt="Document"
                                                            onClick={() => openDocument(expense)}
                                                        />
                                                    ) : expense.documentMimeType === 'application/pdf' ? (
                                                        <div className="pdf-preview" onClick={() => openDocument(expense)}>
                                                            <FaFilePdf />
                                                            <span>PDF Document</span>
                                                        </div>
                                                    ) : (
                                                        <div className="file-preview" onClick={() => openDocument(expense)}>
                                                            <FaFile />
                                                            <span>{expense.documentOriginalName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="document-actions">
                                                    <button
                                                        type="button"
                                                        className="view-btn"
                                                        onClick={() => openDocument(expense)}
                                                    >
                                                        <FaEye /> View
                                                    </button>
                                                    <label className="checkbox-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={values.removeDocument}
                                                            onChange={(e) => setFieldValue("removeDocument", e.target.checked)}
                                                        />
                                                        Remove document
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* UPDATE DOCUMENT */}
                                    <div className="form-group">
                                        <label htmlFor="updateDocument">
                                            <FaUpload /> {expense.documentFileName ? 'Replace Document' : 'Upload Document'}
                                        </label>
                                        <input
                                            type="file"
                                            id="updateDocument"
                                            accept=".pdf,.jpg,.jpeg,.png,.gif"
                                            onChange={(e) => handleFileChange(e, setUpdateUploadedFile, setUpdateFilePreview)}
                                        />
                                        {updateFilePreview && (
                                            <div className="file-preview-container">
                                                <img src={updateFilePreview} alt="Preview" />
                                                <span>{updateUploadedFile?.name}</span>
                                            </div>
                                        )}
                                        <div className="form-note">
                                            Max file size: 10MB. Allowed: PDF, JPG, PNG, GIF
                                        </div>
                                    </div>

                                    {/* DATE RANGE */}
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="dateFrom">
                                                <FaCalendarAlt /> From Date *
                                            </label>
                                            <Field type="date" name="dateFrom" id="dateFrom" />
                                            <ErrorMessage name="dateFrom" component="div" className="error" />
                                        </div>
                                        <div className="form-field">
                                            <label htmlFor="dateTo">
                                                <FaCalendarAlt /> To Date *
                                            </label>
                                            <Field type="date" name="dateTo" id="dateTo" />
                                            <ErrorMessage name="dateTo" component="div" className="error" />
                                        </div>
                                    </div>

                                    {/* CATEGORY */}
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="category">
                                                <FaFileInvoice /> Category *
                                            </label>
                                            <Field as="select" name="category" id="category">
                                                <option value="">Select Category</option>
                                                {categoryOptions.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </Field>
                                            <ErrorMessage name="category" component="div" className="error" />
                                        </div>
                                    </div>

                                    {/* CUSTOM CATEGORY */}
                                    {values.category === "OTHER" && (
                                        <div className="form-row">
                                            <div className="form-field">
                                                <label htmlFor="customCategory">
                                                    Custom Category *
                                                </label>
                                                <Field
                                                    type="text"
                                                    name="customCategory"
                                                    id="customCategory"
                                                    placeholder="Enter custom category"
                                                />
                                                <ErrorMessage name="customCategory" component="div" className="error" />
                                            </div>
                                        </div>
                                    )}

                                    {/* DESCRIPTION */}
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="description">Description *</label>
                                            <Field
                                                as="textarea"
                                                name="description"
                                                id="description"
                                                rows="3"
                                                placeholder="Enter expense description"
                                            />
                                            <ErrorMessage name="description" component="div" className="error" />
                                        </div>
                                    </div>

                                    {/* AMOUNT */}
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="amount">
                                                <FaRupeeSign /> Amount *
                                            </label>
                                            <Field
                                                type="number"
                                                name="amount"
                                                id="amount"
                                                placeholder="Enter amount"
                                            />
                                            <ErrorMessage name="amount" component="div" className="error" />
                                        </div>
                                    </div>

                                    {/* PAYMENT DETAILS */}
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="paymentMode">Payment Mode *</label>
                                            <Field as="select" name="paymentMode" id="paymentMode">
                                                <option value="">Select Mode</option>
                                                {paymentModeOptions.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </Field>
                                            <ErrorMessage name="paymentMode" component="div" className="error" />
                                        </div>
                                        <div className="form-field">
                                            <label htmlFor="paymentStatus">Payment Status *</label>
                                            <Field as="select" name="paymentStatus" id="paymentStatus">
                                                {paymentStatusOptions.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </Field>
                                            <ErrorMessage name="paymentStatus" component="div" className="error" />
                                        </div>
                                    </div>

                                    {/* VENDOR DETAILS */}
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="vendorName">
                                                <FaUser /> Vendor Name *
                                            </label>
                                            <Field
                                                type="text"
                                                name="vendorName"
                                                id="vendorName"
                                                placeholder="Enter vendor name"
                                            />
                                            <ErrorMessage name="vendorName" component="div" className="error" />
                                        </div>
                                        <div className="form-field">
                                            <label htmlFor="vendorType">Vendor Type *</label>
                                            <Field as="select" name="vendorType" id="vendorType">
                                                <option value="">Select Type</option>
                                                {vendorTypeOptions.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </Field>
                                            <ErrorMessage name="vendorType" component="div" className="error" />
                                        </div>
                                    </div>

                                    {/* VENDOR CONTACT */}
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="vendorContact">
                                                <FaPhone /> Vendor Contact (Optional)
                                            </label>
                                            <Field
                                                type="text"
                                                name="vendorContact"
                                                id="vendorContact"
                                                placeholder="Enter contact number"
                                            />
                                            <ErrorMessage name="vendorContact" component="div" className="error" />
                                        </div>
                                    </div>

                                    {/* UPDATE REASON */}
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="updateReason">
                                                <FaHistory /> Update Reason (Optional)
                                            </label>
                                            <Field
                                                as="textarea"
                                                name="updateReason"
                                                id="updateReason"
                                                rows="2"
                                                placeholder="Reason for updating this expense..."
                                            />
                                            <ErrorMessage name="updateReason" component="div" className="error" />
                                        </div>
                                    </div>

                                    {/* SUBMIT BUTTON */}
                                    <button
                                        type="submit"
                                        className="submit-btn"
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? (
                                            <>
                                                <FaSpinner className="spinner" /> Updating...
                                            </>
                                        ) : (
                                            <>
                                                <FaCheckCircle /> Update Expense
                                            </>
                                        )}
                                    </button>
                                </Form>
                            )}
                        </Formik>
                    </div>
                </div>
            </div>
        );
    };

    /* ================= DETAILS MODAL ================= */
    const ExpenseModal = ({ expense }) => {
        const getCategoryLabel = () => {
            // Check if it's a predefined category
            const predefinedCategory = categoryOptions.find(c => c.value === expense.category);
            if (predefinedCategory) {
                return predefinedCategory.label;
            }
            // Otherwise return the category itself (custom category)
            return expense.category || "Other";
        };

        const getPaymentModeLabel = () => {
            return paymentModeOptions.find(p => p.value === expense.paymentMode)?.label || expense.paymentMode;
        };

        const getVendorTypeLabel = () => {
            return vendorTypeOptions.find(v => v.value === expense.vendorType)?.label || expense.vendorType;
        };

        return (
            <div className="modal-overlay" onClick={() => setSelectedExpense(null)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3 className="modal-title">
                            <FaEye /> Expense Details - {expense.expenseNo}
                        </h3>
                        <button className="close-btn" onClick={() => setSelectedExpense(null)}>×</button>
                    </div>

                    <div className="modal-body">
                        <div className="detail-grid">
                            {/* BASIC INFO */}
                            <div className="section-divider">
                                <FaFileInvoice /> Basic Information
                            </div>

                            <div className="detail-row dual">
                                <div className="detail-col">
                                    <div className="detail-label">Expense No</div>
                                    <div className="detail-value badge">{expense.expenseNo}</div>
                                </div>
                                <div className="detail-col">
                                    <div className="detail-label">Category</div>
                                    <div className="detail-value">{getCategoryLabel()}</div>
                                </div>
                            </div>

                            <div className="detail-row dual">
                                <div className="detail-col">
                                    <div className="detail-label">From Date</div>
                                    <div className="detail-value">
                                        {new Date(expense.dateFrom).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="detail-col">
                                    <div className="detail-label">To Date</div>
                                    <div className="detail-value">
                                        {new Date(expense.dateTo).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            <div className="detail-row">
                                <div className="detail-label">Description</div>
                                <div className="detail-value">{expense.description}</div>
                            </div>

                            <div className="detail-row">
                                <div className="detail-label">Amount</div>
                                <div className="detail-value amount">₹{expense.amount}</div>
                            </div>

                            {/* PAYMENT DETAILS */}
                            <div className="section-divider">
                                <FaRupeeSign /> Payment Details
                            </div>

                            <div className="detail-row dual">
                                <div className="detail-col">
                                    <div className="detail-label">Payment Mode</div>
                                    <div className="detail-value">{getPaymentModeLabel()}</div>
                                </div>
                                <div className="detail-col">
                                    <div className="detail-label">Payment Status</div>
                                    <div className={`detail-value badge ${expense.paymentStatus.toLowerCase()}`}>
                                        {expense.paymentStatus}
                                    </div>
                                </div>
                            </div>

                            {/* VENDOR DETAILS */}
                            <div className="section-divider">
                                <FaUser /> Vendor Details
                            </div>

                            <div className="detail-row dual">
                                <div className="detail-col">
                                    <div className="detail-label">Vendor Name</div>
                                    <div className="detail-value">{expense.vendorName}</div>
                                </div>
                                <div className="detail-col">
                                    <div className="detail-label">Vendor Type</div>
                                    <div className="detail-value">{getVendorTypeLabel()}</div>
                                </div>
                            </div>

                            {expense.vendorContact && (
                                <div className="detail-row">
                                    <div className="detail-label">Vendor Contact</div>
                                    <div className="detail-value">
                                        <FaPhone style={{ marginRight: '8px' }} />
                                        {expense.vendorContact}
                                    </div>
                                </div>
                            )}

                            {/* DOCUMENT */}
                            {expense.documentFileName && (
                                <>
                                    <div className="section-divider">
                                        <FaFile /> Document
                                    </div>
                                    <div className="detail-row">
                                        <div className="document-preview-large">
                                            {expense.documentMimeType?.startsWith('image/') ? (
                                                <img
                                                    src={`${import.meta.env.VITE_API_URL}${expense.documentUrl}`}
                                                    alt="Document"
                                                    onClick={() => openDocument(expense)}
                                                />
                                            ) : expense.documentMimeType === 'application/pdf' ? (
                                                <div className="pdf-preview-large" onClick={() => openDocument(expense)}>
                                                    <FaFilePdf />
                                                    <span>PDF Document: {expense.documentOriginalName}</span>
                                                    <button className="view-doc-btn">
                                                        <FaEye /> View Document
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="file-preview-large" onClick={() => openDocument(expense)}>
                                                    <FaFile />
                                                    <span>{expense.documentOriginalName}</span>
                                                    <button className="view-doc-btn">
                                                        <FaEye /> View Document
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* UPDATE HISTORY */}
                            {expense.updateHistory && expense.updateHistory.length > 0 && (
                                <>
                                    <div className="section-divider">
                                        <FaHistory /> Update History
                                    </div>
                                    <div className="update-history">
                                        {expense.updateHistory.slice(-3).reverse().map((history, index) => (
                                            <div key={index} className="history-item">
                                                <div className="history-header">
                                                    <span className="history-date">
                                                        {new Date(history.updatedAt).toLocaleString()}
                                                    </span>
                                                    <span className="history-by">by {history.updatedBy}</span>
                                                </div>
                                                {history.reason && (
                                                    <div className="history-reason">{history.reason}</div>
                                                )}
                                                {history.changes && Object.keys(history.changes).length > 0 && (
                                                    <div className="history-changes">
                                                        {Object.entries(history.changes).map(([key, change]) => (
                                                            <div key={key} className="change-item">
                                                                <span className="change-label">{key}:</span>
                                                                <span className="change-value">
                                                                    {change.from} → {change.to}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <div className="action-buttons">
                            <button
                                className="update-modal-btn"
                                onClick={() => {
                                    setExpenseToUpdate(expense);
                                    setShowUpdateModal(true);
                                }}
                            >
                                <FaEdit /> Update
                            </button>
                            <button
                                className="delete-btn"
                                onClick={() => {
                                    setExpenseToDelete(expense);
                                    setShowDeleteConfirm(true);
                                }}
                            >
                                <FaTrash /> Delete
                            </button>
                            {expense.documentFileName && (
                                <button
                                    className="pdf-btn"
                                    onClick={() => openDocument(expense)}
                                >
                                    <FaFilePdf /> View Document
                                </button>
                            )}
                            <button
                                className="close-modal-btn"
                                onClick={() => setSelectedExpense(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Navbar>
            <ToastContainer
                position="top-center"
                autoClose={8000}
                style={{ zIndex: 99999 }}
            />
            <div className="expense-container">
                {/* PAGE HEADER WITH FILTERS */}
                <div className="expense-page-header">
                    <div className="header-controls">
                        <div className="search-container">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search by expense no, description, vendor..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        <div className="action-buttons-group">
                            <button
                                className="export-btn"
                                onClick={exportToExcel}
                                disabled={isExporting || filteredExpenses.length === 0}
                            >
                                {isExporting ? (
                                    <>
                                        <FaSpinner className="spinner" /> Exporting...
                                    </>
                                ) : (
                                    <>
                                        <FaFileExcel /> Export to Excel
                                    </>
                                )}
                            </button>
                            <button
                                className="add-btn"
                                onClick={() => setShowForm(!showForm)}
                            >
                                <FaPlus /> {showForm ? "Close Form" : "New Expense"}
                            </button>
                        </div>
                    </div>

                    {/* FILTERS ROW */}
                    <div className="filters-panel">
                        <div className="filters-grid">
                            <div className="filter-group">
                                <label>
                                    <FaFilter /> Category
                                </label>
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                >
                                    <option value="ALL">All Categories</option>

                                    {/* Show all predefined categories EXCEPT "OTHER" */}
                                    {categoryOptions
                                        .filter(option => option.value !== "OTHER") // Remove "OTHER" from dropdown
                                        .map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}

                                    {/* Show custom categories that users have created */}
                                    {expenses
                                        .filter(expense => {
                                            // Find expenses where category is NOT in predefined list
                                            const isPredefined = categoryOptions.find(c => c.value === expense.category);
                                            return !isPredefined; // Only custom categories
                                        })
                                        .filter((expense, index, self) => {
                                            // Get unique categories only (no duplicates)
                                            return index === self.findIndex(e => e.category === expense.category);
                                        })
                                        .map(expense => (
                                            <option key={`custom-${expense.expenseId}`} value={expense.category}>
                                                {expense.category} {/* Show the custom name like "Internet Bill" */}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>
                                    <FaFilter /> Payment Status
                                </label>
                                <select
                                    value={filterPaymentStatus}
                                    onChange={(e) => setFilterPaymentStatus(e.target.value)}
                                >
                                    <option value="ALL">All Status</option>
                                    {paymentStatusOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>
                                    <FaCalendarAlt /> From Date
                                </label>
                                <input
                                    type="date"
                                    value={filterDateFrom}
                                    onChange={(e) => setFilterDateFrom(e.target.value)}
                                />
                            </div>

                            <div className="filter-group">
                                <label>
                                    <FaCalendarAlt /> To Date
                                </label>
                                <input
                                    type="date"
                                    value={filterDateTo}
                                    onChange={(e) => setFilterDateTo(e.target.value)}
                                />
                            </div>

                            <div className="filter-actions">
                                <button className="clear-btn" onClick={clearFilters}>
                                    <FaTimes /> Clear Filters
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* EXPENSE FORM */}
                {showForm && (
                    <div className="form-container premium">
                        <h2>
                            <FaFileInvoice /> New Expense Entry
                        </h2>

                        <Formik
                            initialValues={initialValues}
                            validationSchema={validationSchema}
                            onSubmit={handleSubmit}
                        >
                            {({ values, setFieldValue }) => (
                                <Form>
                                    {/* FILE UPLOAD */}
                                    <div className="form-group">
                                        <label htmlFor="document">
                                            <FaUpload /> Upload Document (Optional)
                                        </label>
                                        <input
                                            type="file"
                                            id="document"
                                            name="document"
                                            accept=".pdf,.jpg,.jpeg,.png,.gif"
                                            onChange={(e) => handleFileChange(e, setUploadedFile, setFilePreview)}
                                        />
                                        {filePreview && (
                                            <div className="file-preview-container">
                                                <img src={filePreview} alt="Preview" />
                                                <span>{uploadedFile?.name}</span>
                                            </div>
                                        )}
                                        <div className="form-note">
                                            Max file size: 10MB. Allowed: PDF, JPG, PNG, GIF
                                        </div>
                                    </div>

                                    {/* DATE RANGE */}
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="dateFrom">
                                                <FaCalendarAlt /> From Date *
                                            </label>
                                            <Field type="date" name="dateFrom" id="dateFrom" />
                                            <ErrorMessage name="dateFrom" component="div" className="error" />
                                        </div>
                                        <div className="form-field">
                                            <label htmlFor="dateTo">
                                                <FaCalendarAlt /> To Date *
                                            </label>
                                            <Field type="date" name="dateTo" id="dateTo" />
                                            <ErrorMessage name="dateTo" component="div" className="error" />
                                        </div>
                                    </div>

                                    {/* CATEGORY */}
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="category">
                                                <FaFileInvoice /> Category *
                                            </label>
                                            <Field as="select" name="category" id="category">
                                                <option value="">Select Category</option>
                                                {categoryOptions.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </Field>
                                            <ErrorMessage name="category" component="div" className="error" />
                                        </div>
                                    </div>

                                    {/* CUSTOM CATEGORY */}
                                    {values.category === "OTHER" && (
                                        <div className="form-row">
                                            <div className="form-field">
                                                <label htmlFor="customCategory">
                                                    Custom Category *
                                                </label>
                                                <Field
                                                    type="text"
                                                    name="customCategory"
                                                    id="customCategory"
                                                    placeholder="Enter custom category"
                                                />
                                                <ErrorMessage name="customCategory" component="div" className="error" />
                                            </div>
                                        </div>
                                    )}

                                    {/* DESCRIPTION */}
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="description">Description *</label>
                                            <Field
                                                as="textarea"
                                                name="description"
                                                id="description"
                                                rows="3"
                                                placeholder="Enter expense description"
                                            />
                                            <ErrorMessage name="description" component="div" className="error" />
                                        </div>
                                    </div>

                                    {/* AMOUNT */}
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="amount">
                                                <FaRupeeSign /> Amount *
                                            </label>
                                            <Field
                                                type="number"
                                                name="amount"
                                                id="amount"
                                                placeholder="Enter amount"
                                            />
                                            <ErrorMessage name="amount" component="div" className="error" />
                                        </div>
                                    </div>

                                    {/* PAYMENT DETAILS */}
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="paymentMode">Payment Mode *</label>
                                            <Field as="select" name="paymentMode" id="paymentMode">
                                                <option value="">Select Mode</option>
                                                {paymentModeOptions.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </Field>
                                            <ErrorMessage name="paymentMode" component="div" className="error" />
                                        </div>
                                        <div className="form-field">
                                            <label htmlFor="paymentStatus">Payment Status *</label>
                                            <Field as="select" name="paymentStatus" id="paymentStatus">
                                                {paymentStatusOptions.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </Field>
                                            <ErrorMessage name="paymentStatus" component="div" className="error" />
                                        </div>
                                    </div>

                                    {/* VENDOR DETAILS */}
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="vendorName">
                                                <FaUser /> Vendor Name *
                                            </label>
                                            <Field
                                                type="text"
                                                name="vendorName"
                                                id="vendorName"
                                                placeholder="Enter vendor name"
                                            />
                                            <ErrorMessage name="vendorName" component="div" className="error" />
                                        </div>
                                        <div className="form-field">
                                            <label htmlFor="vendorType">Vendor Type *</label>
                                            <Field as="select" name="vendorType" id="vendorType">
                                                <option value="">Select Type</option>
                                                {vendorTypeOptions.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </Field>
                                            <ErrorMessage name="vendorType" component="div" className="error" />
                                        </div>
                                    </div>

                                    {/* VENDOR CONTACT */}
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="vendorContact">
                                                <FaPhone /> Vendor Contact (Optional)
                                            </label>
                                            <Field
                                                type="text"
                                                name="vendorContact"
                                                id="vendorContact"
                                                placeholder="Enter contact number"
                                            />
                                            <ErrorMessage name="vendorContact" component="div" className="error" />
                                        </div>
                                    </div>

                                    {/* SUBMIT BUTTON */}
                                    <button
                                        type="submit"
                                        className="submit-btn"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <FaSpinner className="spinner" /> Creating Expense...
                                            </>
                                        ) : (
                                            <>
                                                <FaCheckCircle /> Create Expense
                                            </>
                                        )}
                                    </button>
                                </Form>
                            )}
                        </Formik>
                    </div>
                )}

                {/* EXPENSE TABLE */}
                <div className="data-table-container">
                    <div className="table-header">
                        <h3>
                            <FaFileInvoice /> Expense Records ({filteredExpenses.length})
                            {filterCategory !== "ALL" && ` • Category: ${
                                // Check if it's a predefined category
                                categoryOptions.find(c => c.value === filterCategory)
                                    ? categoryOptions.find(c => c.value === filterCategory).label
                                    : filterCategory // If not predefined, show the custom category name
                                }`}
                            {filterPaymentStatus !== "ALL" && ` • Status: ${filterPaymentStatus}`}
                        </h3>
                        {(searchTerm || filterCategory !== "ALL" || filterPaymentStatus !== "ALL" || filterDateFrom || filterDateTo) && (
                            <span className="filter-info">
                                Filters applied •
                                <button className="clear-filters-btn" onClick={clearFilters}>
                                    Clear All
                                </button>
                            </span>
                        )}
                    </div>

                    <div className="data-table">
                        {isLoading ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>Loading expense records...</p>
                            </div>
                        ) : filteredExpenses.length === 0 ? (
                            <div className="empty-state">
                                <p>No expense records found{searchTerm || filterCategory !== "ALL" || filterPaymentStatus !== "ALL" ? ' matching your criteria' : ''}</p>
                                {(searchTerm || filterCategory !== "ALL" || filterPaymentStatus !== "ALL" || filterDateFrom || filterDateTo) && (
                                    <button
                                        className="clear-search-btn"
                                        onClick={clearFilters}
                                    >
                                        Clear All Filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Expense No</th>
                                        <th>Date Range</th>
                                        <th>Category</th>
                                        {/* <th>Description</th>  */}
                                        <th>Vendor</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Document</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredExpenses.map(expense => (
                                        <tr
                                            key={expense.expenseId}
                                            className={`clickable-row ${selectedExpense?.expenseId === expense.expenseId ? 'selected' : ''}`}
                                            onClick={() => setSelectedExpense(expense)}
                                        >
                                            <td>
                                                <div className="expense-no">
                                                    <FaFileInvoice className="icon" />
                                                    {expense.expenseNo}
                                                </div>
                                            </td>
                                            <td className="date-cell">
                                                {new Date(expense.dateFrom).toLocaleDateString()} - {new Date(expense.dateTo).toLocaleDateString()}
                                            </td>
                                            <td>
                                                {expense.category === "OTHER"
                                                    ? expense.customCategory || "Other"
                                                    : categoryOptions.find(c => c.value === expense.category)?.label || expense.category
                                                }
                                            </td>
                                            {/* <td className="description-cell">{expense.description}</td> */}
                                            <td className="vendor-cell">{expense.vendorName}</td>
                                            <td className="amount-cell">₹{expense.amount}</td>
                                            <td>
                                                <span className={`status-badge ${expense.paymentStatus.toLowerCase()}`}>
                                                    {expense.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="document-cell">
                                                {expense.documentFileName ? (
                                                    <span className="doc-available" title="Click to view document">
                                                        <FaFilePdf /> Available
                                                    </span>
                                                ) : (
                                                    <span className="no-doc">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* MODALS */}
                {selectedExpense && <ExpenseModal expense={selectedExpense} />}
                {showUpdateModal && expenseToUpdate && <UpdateModal expense={expenseToUpdate} />}

                {/* DELETE CONFIRMATION MODAL */}
                {showDeleteConfirm && expenseToDelete && (
                    <div className="modal-overlay delete-confirm-overlay">
                        <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
                            <div className="delete-modal-header">
                                <h3>
                                    <FaExclamationTriangle /> Delete Expense?
                                </h3>
                                <button
                                    className="close-btn"
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setExpenseToDelete(null);
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            <div className="delete-modal-body">
                                <div className="warning-section">
                                    <div className="warning-icon">
                                        <FaExclamationTriangle />
                                    </div>
                                    <h4>Warning: This action cannot be undone!</h4>
                                    <p className="warning-text">
                                        Deleting this expense will:
                                    </p>
                                    <ul className="warning-list">
                                        <li>❌ <strong>Permanently delete</strong> the expense record</li>
                                        {expenseToDelete.documentFileName && (
                                            <li>🗑️ <strong>Delete associated document</strong> from server</li>
                                        )}
                                        <li>📊 Expense will be removed from all reports</li>
                                    </ul>
                                </div>

                                <div className="delete-details">
                                    <h5>Expense to delete:</h5>
                                    <div className="delete-info-grid">
                                        <div className="delete-info-item">
                                            <span className="delete-label">Expense No:</span>
                                            <span className="delete-value">{expenseToDelete.expenseNo}</span>
                                        </div>
                                        <div className="delete-info-item">
                                            <span className="delete-label">Description:</span>
                                            <span className="delete-value">{expenseToDelete.description}</span>
                                        </div>
                                        <div className="delete-info-item">
                                            <span className="delete-label">Amount:</span>
                                            <span className="delete-value">₹{expenseToDelete.amount}</span>
                                        </div>
                                        <div className="delete-info-item">
                                            <span className="delete-label">Vendor:</span>
                                            <span className="delete-value">{expenseToDelete.vendorName}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="delete-modal-footer">
                                <button
                                    className="cancel-delete-btn"
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setExpenseToDelete(null);
                                    }}
                                    disabled={isDeleting}
                                >
                                    <FaTimes /> Cancel
                                </button>
                                <button
                                    className="confirm-delete-btn"
                                    onClick={handleDeleteExpense}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <>
                                            <span className="spinner-small"></span>
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <FaTrash /> Yes, Delete Expense
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Navbar>
    );
};

export default Expense;