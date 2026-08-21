import React, { useEffect, useState, useRef } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Select from "react-select";
import { toast, ToastContainer } from "react-toastify";
import {
    FaPlus,
    FaSearch,
    FaEye,
    FaFilePdf,
    FaRupeeSign,
    FaTachometerAlt,
    FaMoneyBillWave,
    FaCalendarAlt,
    FaHome,
    FaUser,
    FaWater,
    FaCog,
    FaExclamationTriangle,
    FaCheckCircle,
    FaFilter,
    FaCalendar,
    FaChartBar,
    FaTrash,
    FaTimes,
    FaPhone,
    FaEnvelope,
    FaWhatsapp,
    FaSpinner,
    FaFileExcel,
    FaEdit,
    FaHistory,
    FaInfoCircle
} from "react-icons/fa";
import Navbar from "../../Components/Sidebar/Navbar";
import "./Maintenance.scss";
import "react-toastify/dist/ReactToastify.css";
import html2pdf from 'html2pdf.js';
import MaintenancePrint from "./MaintenancePrint";
import * as XLSX from 'xlsx';

const Maintenance = () => {
    const [maintenanceRecords, setMaintenanceRecords] = useState([]);
    const [members, setMembers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rates, setRates] = useState({
        waterRate: 0,
        ownerRate: 0,
        rentRate: 0,
    });

    // PDF and WhatsApp states
    const [maintenanceForPrint, setMaintenanceForPrint] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    // Filter states
    const currentDate = new Date();
    const [filterMonth, setFilterMonth] = useState(String(currentDate.getMonth() + 1));
    const [filterYear, setFilterYear] = useState(String(currentDate.getFullYear()));
    const [filterType, setFilterType] = useState("");
    const [filterStatus, setFilterStatus] = useState("");

    /* ================= DELETE MAINTENANCE FUNCTION ================= */
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [maintenanceToDelete, setMaintenanceToDelete] = useState(null);
    const [deleteReason, setDeleteReason] = useState("");

    /* ================= UPDATE MAINTENANCE STATES ================= */
    const [isUpdating, setIsUpdating] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [maintenanceToUpdate, setMaintenanceToUpdate] = useState(null);
    const [updateReason, setUpdateReason] = useState("");

    /* ================= EXPORT TO EXCEL ================= */
    const exportToExcel = () => {
        if (isExportingExcel) return;

        setIsExportingExcel(true);

        try {
            const recordsToExport = getFilteredRecords();

            if (recordsToExport.length === 0) {
                toast.warning("No records to export!");
                setIsExportingExcel(false);
                return;
            }

            const excelData = recordsToExport.map((record, index) => ({
                'S.No': index + 1,
                'Maintenance No': record.maintenanceNo,
                'Flat No': record.flatNo,
                'Member Name': record.memberName,
                'Member Type': record.memberType,
                'Month': record.maintenanceMonth,
                'Year': record.maintenanceYear,
                'Date': new Date(record.collectionDate).toLocaleDateString('en-GB'),
                'Previous Units': record.previousUnitUsed,
                'New Units': record.newReadingUnits,
                'Total Units': record.totalUnits,
                'Water Amount': record.waterMaintenanceAmount,
                'Fixed Amount': record.fixedMaintenanceAmount,
                'Previous Pending': record.previousPendingAmount,
                'Fine Amount': record.fineAmount || 0,
                'Total Due': record.totalMaintenanceAmount,
                'Collected': record.collectionAmount,
                'Pending': record.pendingAmount,
                'Last Updated': record.lastUpdated ? new Date(record.lastUpdated).toLocaleString() : '-'
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);

            const colWidths = [
                { wch: 5 }, { wch: 18 }, { wch: 10 }, { wch: 20 },
                { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 12 },
                { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
                { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 15 },
                { wch: 15 }, { wch: 20 }
            ];
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, "Maintenance");

            let fileName = `Maintenance_Records_${new Date().toISOString().split('T')[0]}`;
            if (filterMonth) {
                const monthName = new Date(0, filterMonth - 1).toLocaleString('default', { month: 'short' });
                fileName += `_${monthName}`;
            }
            if (filterYear) fileName += `_${filterYear}`;
            if (filterType) fileName += `_${filterType}`;
            fileName += '.xlsx';

            XLSX.writeFile(wb, fileName);
            toast.success(`Exported ${recordsToExport.length} records!`);

        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to export");
        } finally {
            setIsExportingExcel(false);
        }
    };

    /* ================= WHATSAPP MESSAGE FUNCTION ================= */
    const sendWhatsAppMessage = (maintenance) => {
        if (!maintenance || !maintenance.memberMobile) {
            toast.warning("Mobile number not available for WhatsApp");
            return;
        }

        const mobile = maintenance.memberMobile.replace(/\D/g, "");

        if (mobile.length !== 10) {
            toast.warning("Invalid mobile number for WhatsApp");
            return;
        }

        const message = `*🏠 Maintenance Receipt - ${maintenance.maintenanceNo}*\n\n` +
            `*Flat No:* ${maintenance.flatNo}\n` +
            `*Member:* ${maintenance.memberName}\n` +
            `*Month/Year:* ${maintenance.maintenanceMonth}/${maintenance.maintenanceYear}\n` +
            `*Date:* ${new Date(maintenance.collectionDate).toLocaleDateString()}\n` +
            `*Type:* ${maintenance.memberType}\n\n` +
            `*📊 Maintenance Breakdown:*\n` +
            `Water Amount: ₹${maintenance.waterMaintenanceAmount.toFixed(2)}\n` +
            `Fixed Maintenance: ₹${maintenance.fixedMaintenanceAmount.toFixed(2)}\n` +
            `Previous Pending: ₹${maintenance.previousPendingAmount.toFixed(2)}\n` +
            (maintenance.fineAmount > 0 ? `Fine Amount: ₹${maintenance.fineAmount.toFixed(2)}\n` : '') +
            `*Total Maintenance:* ₹${maintenance.totalMaintenanceAmount.toFixed(2)}\n\n` +
            `*💰 Payment Details:*\n` +
            `Amount Collected: ₹${maintenance.collectionAmount.toFixed(2)}\n` +
            (maintenance.pendingAmount > 0 ? `New Pending Amount: ₹${maintenance.pendingAmount.toFixed(2)}\n` : '') +
            `\nThank you for your payment! 🙏\n` +
            `Receipt PDF has been downloaded.`;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/91${mobile}?text=${encodedMessage}`, "_blank");
    };

    /* ================= PDF GENERATION FUNCTION ================= */
    const generatePDF = async (maintenance) => {
        if (!maintenance) return;
        if (isExporting) return;

        setIsExporting(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const element = document.getElementById("maintenance-pdf");
            if (!element) {
                await new Promise(resolve => setTimeout(resolve, 500));
                const retryElement = document.getElementById("maintenance-pdf");
                if (!retryElement) {
                    throw new Error("PDF print element not found");
                }
            }

            const addFooterToEachPage = (pdf) => {
                const totalPages = pdf.internal.getNumberOfPages();
                const pageHeight = pdf.internal.pageSize.getHeight();

                for (let i = 1; i <= totalPages; i++) {
                    pdf.setPage(i);
                    pdf.setFontSize(8);
                    pdf.setFont("helvetica", "italic");
                    pdf.setTextColor(100, 100, 100);

                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const text = "THIS IS A COMPUTER GENERATED RECEIPT";
                    const textWidth = pdf.getTextWidth(text);
                    const xPosition = (pageWidth - textWidth) / 2;
                    const yPosition = pageHeight - 10;

                    pdf.text(text, xPosition, yPosition);
                    pdf.setDrawColor(200, 200, 200);
                    pdf.line(15, yPosition - 3, pageWidth - 15, yPosition - 3);
                }

                return pdf;
            };

            const opt = {
                filename: `${maintenance.maintenanceNo}_${(maintenance.memberName || "member").replace(/\s+/g, "_")}.pdf`,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    letterRendering: true
                },
                jsPDF: {
                    unit: "mm",
                    format: "a4",
                    orientation: "portrait"
                },
                pagebreak: {
                    mode: ['css', 'legacy'],
                    avoid: ['tr', '.maintenance-footer']
                },
                margin: [0, 0, 20, 0]
            };

            await html2pdf()
                .set(opt)
                .from(element)
                .toPdf()
                .get('pdf')
                .then((pdf) => {
                    return addFooterToEachPage(pdf);
                })
                .save();

            console.log("PDF generated successfully");

        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to generate PDF");
            throw error;
        } finally {
            setIsExporting(false);
        }
    };

    /* ================= PDF & WHATSAPP AUTO-TRIGGER ================= */
    useEffect(() => {
        if (!maintenanceForPrint) return;

        const generatePDFAndHandleWhatsApp = async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await generatePDF(maintenanceForPrint.maintenance);

                if (maintenanceForPrint.openWhatsapp) {
                    sendWhatsAppMessage(maintenanceForPrint.maintenance);
                }

            } catch (error) {
                console.error("Error in PDF/WhatsApp process:", error);
                toast.error("Failed to generate PDF");
            } finally {
                setMaintenanceForPrint(null);
            }
        };

        generatePDFAndHandleWhatsApp();
    }, [maintenanceForPrint]);

    /* ================= HANDLE DELETE MAINTENANCE ================= */
    const handleDeleteMaintenance = async () => {
        if (!maintenanceToDelete) return;

        try {
            setIsDeleting(true);
            console.log("🗑️ Deleting maintenance:", maintenanceToDelete.maintenanceNo);

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/maintenance/delete-maintenance/${maintenanceToDelete.maintenanceNo}`,
                {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reason: deleteReason || "Manual deletion" })
                }
            );

            const result = await response.json();
            console.log("🗑️ Delete response:", result);

            if (response.ok && result.success) {
                setMaintenanceRecords(prev =>
                    prev.filter(record => record.maintenanceNo !== maintenanceToDelete.maintenanceNo)
                );

                setSelectedRecord(null);
                setShowDeleteConfirm(false);
                setMaintenanceToDelete(null);
                setDeleteReason("");

                toast.success(result.message || "Maintenance deleted successfully with rollback!");
                fetchMembers();
            } else {
                let errorMessage = result.message || "Failed to delete maintenance";

                if (result.error && result.error.includes("higher sequence")) {
                    const flatNo = result.details?.flatNo || maintenanceToDelete.flatNo;
                    const nextMaintenance = result.suggestion?.match(/Delete (MAIN\d+) first/)?.[1] ||
                        result.error.match(/Maintenance (MAIN\d+) exists/)?.[1];

                    errorMessage = `⚠️ Cannot delete ${maintenanceToDelete.maintenanceNo}`;

                    if (nextMaintenance) {
                        errorMessage += `\n\nNewer maintenance ${nextMaintenance} exists for flat ${flatNo}.`;
                        errorMessage += `\n\nPlease delete ${nextMaintenance} first.`;
                    }
                }

                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error("❌ Delete error:", error);
            const errorLines = error.message.split('\n');

            toast.error(
                <div style={{ textAlign: 'left', padding: '5px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '15px' }}>
                        <FaExclamationTriangle style={{ marginRight: '8px' }} />
                        {errorLines[0]}
                    </div>

                    {errorLines.length > 1 && (
                        <div style={{
                            color: '#f8f9fa',
                            fontSize: '14px',
                            lineHeight: '1.4',
                            marginTop: '5px'
                        }}>
                            {errorLines.slice(1).map((line, index) => (
                                <div key={index} style={{ marginTop: index > 0 ? '4px' : '0' }}>
                                    {line}
                                </div>
                            ))}
                        </div>
                    )}

                    {error.message.includes("newer maintenance") && (
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '8px',
                            borderRadius: '4px',
                            marginTop: '10px',
                            fontSize: '13px',
                            borderLeft: '3px solid #ffd166'
                        }}>
                            <strong>💡 Tip:</strong> Delete maintenance records in reverse order (highest number first).
                        </div>
                    )}
                </div>,
                {
                    autoClose: 6000,
                    closeButton: true,
                    position: "top-center",
                    style: {
                        background: 'linear-gradient(135deg, #ff6b6b, #dc3545)',
                        color: 'white',
                        borderRadius: '8px',
                        minWidth: '400px',
                        maxWidth: '500px',
                        boxShadow: '0 5px 20px rgba(0, 0, 0, 0.3)',
                    }
                }
            );
        } finally {
            setIsDeleting(false);
        }
    };

    /* ================= HANDLE UPDATE MAINTENANCE ================= */
    const handleUpdateMaintenance = async (values) => {
        if (!maintenanceToUpdate) return;

        try {
            setIsUpdating(true);

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/maintenance/update-maintenance/${maintenanceToUpdate.maintenanceNo}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        newReadingUnits: values.newReadingUnits,
                        collectionAmount: values.collectionAmount,
                        updateReason: updateReason || "Manual update",
                        updatedBy: "admin"
                    })
                }
            );

            const result = await response.json();

            if (response.ok && result.success) {
                // Update the record in state
                setMaintenanceRecords(prev =>
                    prev.map(record =>
                        record.maintenanceNo === maintenanceToUpdate.maintenanceNo
                            ? { ...record, ...result.data.maintenance }
                            : record
                    )
                );

                // Update selected record if it's the same
                if (selectedRecord?.maintenanceNo === maintenanceToUpdate.maintenanceNo) {
                    setSelectedRecord({ ...selectedRecord, ...result.data.maintenance });
                }

                setShowUpdateModal(false);
                setMaintenanceToUpdate(null);
                setUpdateReason("");

                toast.success("Maintenance updated successfully!");

                // Refresh members data
                fetchMembers();
            } else {
                throw new Error(result.message || "Failed to update maintenance");
            }
        } catch (error) {
            console.error("❌ Update error:", error);
            toast.error(error.message || "Failed to update maintenance");
        } finally {
            setIsUpdating(false);
        }
    };

    const confirmDelete = (record) => {
        setMaintenanceToDelete(record);
        setShowDeleteConfirm(true);
    };

    const openUpdateModal = (record) => {
        setMaintenanceToUpdate(record);
        setUpdateReason("");
        setShowUpdateModal(true);
    };

    /* ================= FETCH DATA ================= */
    useEffect(() => {
        fetchMaintenanceRecords();
        fetchMembers();
        fetchRates();
    }, []);

    const fetchMaintenanceRecords = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${import.meta.env.VITE_API_URL}/maintenance/get-all`);
            const data = await res.json();
            setMaintenanceRecords(data);
        } catch {
            toast.error("Failed to fetch maintenance records");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMembers = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/member/get-members`);
            const data = await res.json();
            setMembers(data);
        } catch {
            toast.error("Failed to fetch members");
        }
    };

    const fetchRates = async () => {
        try {
            const [waterRes, maintenanceRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/water-rate/get`),
                fetch(`${import.meta.env.VITE_API_URL}/maintenance-rate/get`)
            ]);

            const waterData = waterRes.ok ? await waterRes.json() : { unitRate: 0 };
            const maintenanceData = maintenanceRes.ok ? await maintenanceRes.json() : {
                ownerRate: 0,
                rentRate: 0,
                shopRate: 0,   // ADD THIS
                closeRate: 0   // ADD THIS
            };

            setRates({
                waterRate: waterData.unitRate || 0,
                ownerRate: maintenanceData.ownerRate || 0,
                rentRate: maintenanceData.rentRate || 0,
                shopRate: maintenanceData.shopRate || 0,   // ADD THIS
                closeRate: maintenanceData.closeRate || 0  // ADD THIS
            });
        } catch {
            toast.error("Failed to fetch rates");
        }
    };

    /* ================= FORM INITIAL VALUES ================= */
    const initialValues = {
        maintenanceMonth: String(new Date().getMonth() + 1),
        maintenanceYear: String(new Date().getFullYear()),
        memberId: "",
        newReadingUnits: "",
        fineAmount: 0,
        fineReason: "",
        collectionAmount: "",
        collectionDate: new Date().toISOString().split("T")[0]
    };

    const validationSchema = Yup.object({
        maintenanceMonth: Yup.number()
            .required("Month is required")
            .min(1, "Invalid month")
            .max(12, "Invalid month"),
        maintenanceYear: Yup.number()
            .required("Year is required")
            .min(2020, "Invalid year")
            .max(2100, "Invalid year"),
        memberId: Yup.string().required("Please select a flat"),
        newReadingUnits: Yup.number()
            .required("New reading is required")
            .min(0, "Cannot be negative")
            .typeError("Must be a number"),
        fineAmount: Yup.number().min(0, "Cannot be negative").optional(),
        collectionAmount: Yup.number()
            .required("Collection amount is required")
            .min(0, "Cannot be negative")
            .typeError("Must be a number"),
        collectionDate: Yup.date().required("Collection date is required"),
    });

    const handleSubmit = async (values, { resetForm, setFieldError }) => {
        try {
            setIsSubmitting(true);

            // First check if maintenance already exists for this flat in selected month/year
            const checkResponse = await fetch(
                `${import.meta.env.VITE_API_URL}/maintenance/check-existing?flatNo=${selectedMember?.data?.flatNumber}&month=${values.maintenanceMonth}&year=${values.maintenanceYear}`
            );

            const checkResult = await checkResponse.json();

            if (checkResult.exists) {
                setFieldError("maintenanceMonth", `Maintenance already exists for this flat in ${values.maintenanceMonth}/${values.maintenanceYear}`);
                toast.error(`Maintenance already created for this flat in ${values.maintenanceMonth}/${values.maintenanceYear}`);
                setIsSubmitting(false);
                return;
            }

            console.log("📤 Sending to backend:", values);

            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/maintenance/create-maintenance`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                }
            );

            const responseData = await res.json();
            console.log("📥 Backend response:", responseData);

            if (!res.ok) {
                if (responseData.field) setFieldError(responseData.field, responseData.message);
                throw new Error(responseData.message || "Failed to create maintenance");
            }

            if (responseData.success && responseData.data) {
                const newMaintenance = responseData.data;

                setMaintenanceRecords(prev => [newMaintenance, ...prev]);
                resetForm();
                setShowForm(false);
                setSelectedMember(null);

                setMaintenanceForPrint({
                    maintenance: newMaintenance,
                    openWhatsapp: true
                });

                toast.success("Maintenance created successfully! Downloading receipt...");

            } else {
                throw new Error("Invalid response from server");
            }

        } catch (err) {
            console.error("❌ Submission error:", err);
            toast.error(err.message || "Failed to create maintenance");
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ================= MEMBER SELECTION ================= */
    const [selectedMember, setSelectedMember] = useState(null);
    const memberOptions = members.map((m) => ({
        value: m.memberId,
        label: `${m.flatNumber} - ${m.name} (${m.type})`,
        data: m
    }));

    const calculateTotals = (values, member) => {
        if (!member) return null;

        const previousUnit = member.unitsUsed || 0;

        // ALLOW 0 OR ANY NUMBER - DON'T RESTRICT
        let totalUnits = 0;
        if (values.newReadingUnits !== undefined && values.newReadingUnits !== null) {
            totalUnits = Math.max(0, values.newReadingUnits - previousUnit);
        }

        const waterAmount = totalUnits * rates.waterRate;

        // Get fixed maintenance rate based on type
        let fixedMaintenance = 0;
        if (member.type === "OWNER") {
            fixedMaintenance = rates.ownerRate || 0;
        } else if (member.type === "RENT") {
            fixedMaintenance = rates.rentRate || 0;
        } else if (member.type === "SHOP") {
            fixedMaintenance = rates.shopRate || 0;
        } else if (member.type === "CLOSE") {
            fixedMaintenance = rates.closeRate || 0;
        }

        const previousPending = member.pendingAmount || 0;
        const totalMaintenance = waterAmount + fixedMaintenance + previousPending + Number(values.fineAmount || 0);
        const collectionAmt = Number(values.collectionAmount) || 0;
        const pendingAmount = Math.max(0, totalMaintenance - collectionAmt);

        return {
            previousUnit,
            totalUnits,
            waterAmount,
            fixedMaintenance,
            previousPending,
            totalMaintenance,
            pendingAmount,
            collectionAmt,
            waterRate: rates.waterRate
        };
    };

    /* ================= UPDATE MODAL COMPONENT ================= */
    const UpdateModal = ({ maintenance }) => {
        const [formValues, setFormValues] = useState({
            newReadingUnits: maintenance.newReadingUnits,
            remainingAmount: maintenance.pendingAmount.toString(), // Start with current pending
            additionalCollection: 0,
        });

        const calculateUpdateTotals = () => {
            const previousUnit = maintenance.previousUnitUsed;
            const totalUnits = formValues.newReadingUnits >= previousUnit
                ? formValues.newReadingUnits - previousUnit
                : 0;

            const waterAmount = totalUnits * maintenance.waterUnitRate;
            const totalMaintenance = waterAmount +
                maintenance.fixedMaintenanceAmount +
                maintenance.previousPendingAmount +
                maintenance.fineAmount;

            // Calculate collection amount
            let collectionAmount = maintenance.collectionAmount;

            if (formValues.remainingAmount !== "" && formValues.remainingAmount !== undefined) {
                // If user enters remaining amount (what's left to pay)
                const remaining = Number(formValues.remainingAmount) || 0;
                collectionAmount = totalMaintenance - remaining;
            } else if (formValues.additionalCollection > 0) {
                // If user enters additional collection
                collectionAmount = maintenance.collectionAmount + Number(formValues.additionalCollection);
            }

            const pendingAmount = totalMaintenance - collectionAmount;

            return {
                totalUnits,
                waterAmount,
                totalMaintenance,
                collectionAmount,
                pendingAmount: pendingAmount > 0 ? pendingAmount : 0,
                remainingAmount: formValues.remainingAmount
            };
        };

        const totals = calculateUpdateTotals();

        const handleUpdate = () => {
            // Make sure we're sending the correct values
            const updateData = {
                newReadingUnits: formValues.newReadingUnits,
                collectionAmount: totals.collectionAmount, // Use calculated collection amount
                updateReason: updateReason || "Manual update",
                updatedBy: "admin"
            };

            console.log("📤 Sending update data:", updateData);
            console.log("📊 Before update:", {
                currentCollection: maintenance.collectionAmount,
                currentPending: maintenance.pendingAmount,
                newCollection: totals.collectionAmount,
                newPending: totals.pendingAmount
            });

            handleUpdateMaintenance(updateData);
        };

        return (
            <div className="modal-overlay update-overlay" onClick={() => setShowUpdateModal(false)}>
                <div className="modal-content update-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3 className="modal-title">
                            <FaEdit /> Update Maintenance - {maintenance.maintenanceNo}
                        </h3>
                        <button className="close-btn" onClick={() => setShowUpdateModal(false)}>×</button>
                    </div>

                    <div className="modal-body">
                        <div className="update-info">
                            <div className="info-row">
                                <div className="info-item">
                                    <span className="info-label">Flat No:</span>
                                    <span className="info-value">{maintenance.flatNo}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Member:</span>
                                    <span className="info-value">{maintenance.memberName}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Month/Year:</span>
                                    <span className="info-value">{maintenance.maintenanceMonth}/{maintenance.maintenanceYear}</span>
                                </div>
                            </div>

                            {/* CURRENT STATUS */}
                            <div className="current-status">
                                <h4>Current Status</h4>
                                <div className="status-grid">
                                    <div className="status-item">
                                        <span className="status-label">Total Due:</span>
                                        <span className="status-value">₹{maintenance.totalMaintenanceAmount}</span>
                                    </div>
                                    <div className="status-item">
                                        <span className="status-label">Collected:</span>
                                        <span className="status-value success">₹{maintenance.collectionAmount}</span>
                                    </div>
                                    <div className="status-item">
                                        <span className="status-label">Remaining:</span>
                                        <span className="status-value pending">₹{maintenance.pendingAmount}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="update-form">
                            <div className="form-group">
                                <label htmlFor="newReadingUnits">
                                    <FaTachometerAlt /> New Reading Units *
                                </label>
                                <input
                                    type="number"
                                    id="newReadingUnits"
                                    value={formValues.newReadingUnits}
                                    onChange={(e) => setFormValues({
                                        ...formValues,
                                        newReadingUnits: e.target.value
                                    })}
                                    min={maintenance.previousUnitUsed}
                                    placeholder={`Enter new reading (min: ${maintenance.previousUnitUsed})`}
                                />
                                <div className="form-note">
                                    Previous Reading: {maintenance.previousUnitUsed}
                                </div>
                            </div>

                            {/* COLLECTION UPDATE OPTIONS */}
                            <div className="collection-options">
                                <h4>Update Collection</h4>

                                <div className="form-group">
                                    <label htmlFor="remainingAmount">
                                        <FaRupeeSign />Remaining Amount
                                    </label>
                                    <input
                                        type="number"
                                        id="remainingAmount"
                                        value={formValues.remainingAmount}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setFormValues({
                                                ...formValues,
                                                remainingAmount: value,
                                                additionalCollection: 0 // Reset additional
                                            });
                                        }}
                                        readOnly
                                        min="0"
                                        max={maintenance.totalMaintenanceAmount}
                                        placeholder={`What will remain unpaid? (Current: ₹${maintenance.pendingAmount})`}
                                    />
                                    <div className="form-note">
                                        <strong>Example:</strong> Enter 0 for full payment, or enter 200 if ₹200 will remain unpaid
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="additionalCollection">
                                        <FaRupeeSign /> Or Add Payment *
                                    </label>
                                    <input
                                        type="number"
                                        id="additionalCollection"
                                        value={formValues.additionalCollection}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setFormValues({
                                                ...formValues,
                                                additionalCollection: value,
                                                remainingAmount: "" // Reset remaining
                                            });
                                        }}
                                        min="0"
                                        max={maintenance.pendingAmount}
                                        placeholder={`Add payment to current (max: ₹${maintenance.pendingAmount})`}
                                    />
                                    <div className="form-note">
                                        <strong>Example:</strong> Enter 300 to add ₹300 to current collection of ₹{maintenance.collectionAmount}
                                    </div>
                                </div>
                            </div>

                            {/* <div className="form-group">
                            <label htmlFor="updateReason">
                                <FaHistory /> Update Reason (Optional)
                            </label>
                            <textarea
                                id="updateReason"
                                value={updateReason}
                                onChange={(e) => setUpdateReason(e.target.value)}
                                placeholder="Enter reason for updating..."
                                rows="3"
                            />
                        </div> */}

                            {/* Update Preview */}
                            <div className="update-preview">
                                <h4>Update Preview</h4>
                                <div className="preview-grid">
                                    <div className="preview-item">
                                        <span className="preview-label">Water Amount:</span>
                                        <span className="preview-value">₹{totals.waterAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="preview-item">
                                        <span className="preview-label">Total Due:</span>
                                        <span className="preview-value">₹{totals.totalMaintenance.toFixed(2)}</span>
                                    </div>
                                    <div className="preview-item">
                                        <span className="preview-label">Total Collected:</span>
                                        <span className="preview-value success">₹{totals.collectionAmount.toFixed(2)}</span>
                                        <div className="change-indicator">
                                            {totals.collectionAmount !== maintenance.collectionAmount && (
                                                <span className="change-arrow">
                                                    (₹{maintenance.collectionAmount} → ₹{totals.collectionAmount.toFixed(2)})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="preview-item">
                                        <span className="preview-label">New Remaining:</span>
                                        <span className="preview-value pending">₹{totals.pendingAmount.toFixed(2)}</span>
                                        <div className="change-indicator">
                                            {totals.pendingAmount !== maintenance.pendingAmount && (
                                                <span className="change-arrow">
                                                    (₹{maintenance.pendingAmount} → ₹{totals.pendingAmount.toFixed(2)})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            className="cancel-btn"
                            onClick={() => setShowUpdateModal(false)}
                            disabled={isUpdating}
                        >
                            <FaTimes /> Cancel
                        </button>
                        <button
                            className="update-btn"
                            onClick={handleUpdate}
                            disabled={isUpdating ||
                                (!formValues.remainingAmount && !formValues.additionalCollection && formValues.newReadingUnits === maintenance.newReadingUnits)
                            }
                        >
                            {isUpdating ? (
                                <>
                                    <FaSpinner className="spinner" /> Updating...
                                </>
                            ) : (
                                <>
                                    <FaCheckCircle /> Update Maintenance
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    /* ================= ENHANCED RECORD DETAILS MODAL ================= */
    const RecordModal = ({ record }) => {
        useEffect(() => {
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    setSelectedRecord(null);
                }
            };
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }, []);

        return (
            <>
                <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <FaEye /> Maintenance Details - {record.maintenanceNo}
                            </h3>
                            <button className="close-btn" onClick={() => setSelectedRecord(null)}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="detail-grid">
                                {/* BASIC INFORMATION */}
                                <div className="section-divider">
                                    <FaHome /> Basic Information
                                </div>

                                <div className="detail-row dual">
                                    <div className="detail-col">
                                        <div className="detail-label">Maintenance No</div>
                                        <div className="detail-value badge">{record.maintenanceNo}</div>
                                    </div>
                                    <div className="detail-col">
                                        <div className="detail-label">Month/Year</div>
                                        <div className="detail-value badge">
                                            {record.maintenanceMonth}/{record.maintenanceYear}
                                        </div>
                                    </div>
                                </div>

                                <div className="detail-row dual">
                                    <div className="detail-col">
                                        <div className="detail-label">Collection Date</div>
                                        <div className="detail-value">
                                            {new Date(record.collectionDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="detail-col">
                                        <div className="detail-label">Last Updated</div>
                                        <div className="detail-value">
                                            {record.lastUpdated ?
                                                new Date(record.lastUpdated).toLocaleString() :
                                                'Never'
                                            }
                                        </div>
                                    </div>
                                </div>

                                <div className="detail-row dual">
                                    <div className="detail-col">
                                        <div className="detail-label">Flat Number</div>
                                        <div className="detail-value">{record.flatNo}</div>
                                    </div>
                                    <div className="detail-col">
                                        <div className="detail-label">Member Type</div>
                                        <div className="detail-value badge">{record.memberType}</div>
                                    </div>
                                </div>

                                <div className="detail-row">
                                    <div className="detail-label">Member Name</div>
                                    <div className="detail-value">{record.memberName}</div>
                                </div>

                                {/* MOBILE AND EMAIL */}
                                {(record.memberMobile || record.memberEmail) && (
                                    <div className="detail-row dual">
                                        {record.memberMobile && (
                                            <div className="detail-col">
                                                <div className="detail-label">Mobile</div>
                                                <div className="detail-value">
                                                    <FaPhone style={{ marginRight: '8px' }} />
                                                    {record.memberMobile}
                                                </div>
                                            </div>
                                        )}
                                        {record.memberEmail && (
                                            <div className="detail-col">
                                                <div className="detail-label">Email</div>
                                                <div className="detail-value">
                                                    <FaEnvelope style={{ marginRight: '8px' }} />
                                                    {record.memberEmail}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* WATER USAGE */}
                                <div className="section-divider">
                                    <FaWater /> Water Usage Details
                                </div>

                                <div className="detail-row combined">
                                    <div className="detail-col">
                                        <div className="detail-label">Previous Units</div>
                                        <div className="detail-value">{record.previousUnitUsed}</div>
                                    </div>
                                    <div className="detail-col">
                                        <div className="detail-label">New Units</div>
                                        <div className="detail-value">{record.newReadingUnits}</div>
                                    </div>
                                    <div className="detail-col">
                                        <div className="detail-label">Total Units</div>
                                        <div className="detail-value badge">{record.totalUnits}</div>
                                    </div>
                                </div>

                                <div className="detail-row dual">
                                    <div className="detail-col">
                                        <div className="detail-label">Water Rate</div>
                                        <div className="detail-value">₹{record.waterUnitRate}/unit</div>
                                    </div>
                                    <div className="detail-col">
                                        <div className="detail-label">Water Amount</div>
                                        <div className="detail-value amount">₹{record.waterMaintenanceAmount}</div>
                                    </div>
                                </div>

                                {/* MAINTENANCE CHARGES */}
                                <div className="section-divider">
                                    <FaMoneyBillWave /> Maintenance Charges
                                </div>

                                <div className="detail-row dual">
                                    <div className="detail-col">
                                        <div className="detail-label">Fixed Rate</div>
                                        <div className="detail-value">₹{record.fixedMaintenanceRate}</div>
                                    </div>
                                    <div className="detail-col">
                                        <div className="detail-label">Fixed Amount</div>
                                        <div className="detail-value amount">₹{record.fixedMaintenanceAmount}</div>
                                    </div>
                                </div>

                                {/* FINE DETAILS */}
                                {record.fineAmount > 0 && (
                                    <>
                                        <div className="section-divider">
                                            <FaExclamationTriangle /> Fine Details
                                        </div>

                                        <div className="detail-row dual">
                                            <div className="detail-col">
                                                <div className="detail-label">Fine Amount</div>
                                                <div className="detail-value amount error">₹{record.fineAmount}</div>
                                            </div>
                                            <div className="detail-col">
                                                <div className="detail-label">Fine Reason</div>
                                                <div className="detail-value">{record.fineReason || "Not specified"}</div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* PAYMENT SUMMARY */}
                                <div className="section-divider">
                                    <FaRupeeSign /> Payment Summary
                                </div>

                                <div className="payment-summary">
                                    <div className="summary-item">
                                        <div className="summary-label">Water Amount:</div>
                                        <div className="summary-value">₹{record.waterMaintenanceAmount}</div>
                                    </div>
                                    <div className="summary-item">
                                        <div className="summary-label">Fixed Maintenance:</div>
                                        <div className="summary-value">₹{record.fixedMaintenanceAmount}</div>
                                    </div>
                                    <div className="summary-item">
                                        <div className="summary-label">Previous Pending:</div>
                                        <div className="summary-value">₹{record.previousPendingAmount}</div>
                                    </div>

                                    {record.fineAmount > 0 && (
                                        <div className="summary-item">
                                            <div className="summary-label">Fine Amount:</div>
                                            <div className="summary-value error">₹{record.fineAmount}</div>
                                        </div>
                                    )}

                                    <div className="summary-item total">
                                        <div className="summary-label">Total Maintenance:</div>
                                        <div className="summary-value">₹{record.totalMaintenanceAmount}</div>
                                    </div>

                                    <div className="summary-item">
                                        <div className="summary-label">Collection Amount:</div>
                                        <div className="summary-value success">₹{record.collectionAmount}</div>
                                    </div>

                                    <div className="summary-item pending">
                                        <div className="summary-label">New Pending Amount:</div>
                                        <div className="summary-value">₹{record.pendingAmount}</div>
                                    </div>
                                </div>

                                {/* UPDATE HISTORY */}
                                {record.updateHistory && record.updateHistory.length > 0 && (
                                    <>
                                        <div className="section-divider">
                                            <FaHistory /> Update History
                                        </div>
                                        <div className="update-history">
                                            {record.updateHistory.slice(-3).reverse().map((history, index) => (
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
                                {/* UPDATE BUTTON */}
                                <button
                                    className="update-modal-btn"
                                    onClick={() => openUpdateModal(record)}
                                >
                                    <FaEdit /> Update
                                </button>

                                {/* PDF EXPORT BUTTON */}
                                <button
                                    className="pdf-btn"
                                    onClick={() => {
                                        setMaintenanceForPrint({
                                            maintenance: record,
                                            openWhatsapp: false
                                        });
                                        toast.info("Generating PDF receipt...");
                                    }}
                                    disabled={isExporting}
                                >
                                    {isExporting ? (
                                        <>
                                            <FaSpinner className="spinner" /> Generating...
                                        </>
                                    ) : (
                                        <>
                                            <FaFilePdf /> Export PDF
                                        </>
                                    )}
                                </button>

                                {/* DELETE BUTTON */}
                                <button
                                    className="delete-btn"
                                    onClick={() => confirmDelete(record)}
                                >
                                    <FaTrash /> Delete
                                </button>

                                {/* CLOSE BUTTON */}
                                <button
                                    className="close-modal-btn"
                                    onClick={() => setSelectedRecord(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* DELETE CONFIRMATION MODAL */}
                {showDeleteConfirm && maintenanceToDelete?.maintenanceNo === record.maintenanceNo && (
                    <div className="modal-overlay delete-confirm-overlay">
                        <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
                            <div className="delete-modal-header">
                                <h3>
                                    <FaExclamationTriangle /> Delete Maintenance?
                                </h3>
                                <button
                                    className="close-btn"
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setMaintenanceToDelete(null);
                                        setDeleteReason("");
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
                                        Deleting this maintenance will:
                                    </p>
                                    <ul className="warning-list">
                                        <li>❌ <strong>Permanently delete</strong> the maintenance record</li>
                                        <li>↩️ <strong>Rollback member data:</strong> Units and Pending amount will revert to previous values</li>
                                        <li>💾 Maintenance will be moved to archive for audit purposes</li>
                                    </ul>
                                </div>

                                <div className="delete-details">
                                    <h5>Maintenance to delete:</h5>
                                    <div className="delete-info-grid">
                                        <div className="delete-info-item">
                                            <span className="delete-label">Maintenance No:</span>
                                            <span className="delete-value">{maintenanceToDelete.maintenanceNo}</span>
                                        </div>
                                        <div className="delete-info-item">
                                            <span className="delete-label">Flat No:</span>
                                            <span className="delete-value">{maintenanceToDelete.flatNo}</span>
                                        </div>
                                        <div className="delete-info-item">
                                            <span className="delete-label">Month/Year:</span>
                                            <span className="delete-value">{maintenanceToDelete.maintenanceMonth}/{maintenanceToDelete.maintenanceYear}</span>
                                        </div>
                                        <div className="delete-info-item">
                                            <span className="delete-label">Member:</span>
                                            <span className="delete-value">{maintenanceToDelete.memberName}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="rollback-details">
                                    <h5>What will be rolled back?</h5>
                                    <div className="rollback-grid">
                                        <div className="rollback-item">
                                            <span className="rollback-label">Member Units:</span>
                                            <span className="rollback-value">
                                                {maintenanceToDelete.newReadingUnits} → {maintenanceToDelete.previousUnitUsed}
                                            </span>
                                        </div>
                                        <div className="rollback-item">
                                            <span className="rollback-label">Pending Amount:</span>
                                            <span className="rollback-value">
                                                ₹{maintenanceToDelete.pendingAmount} → ₹{maintenanceToDelete.previousPendingAmount}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="reason-input">
                                    <label htmlFor="deleteReason">
                                        <FaExclamationTriangle /> Reason for deletion (Optional):
                                    </label>
                                    <textarea
                                        id="deleteReason"
                                        value={deleteReason}
                                        onChange={(e) => setDeleteReason(e.target.value)}
                                        placeholder="Enter reason for deleting this maintenance..."
                                        rows="3"
                                    />
                                </div>
                            </div>

                            <div className="delete-modal-footer">
                                <button
                                    className="cancel-delete-btn"
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setMaintenanceToDelete(null);
                                        setDeleteReason("");
                                    }}
                                    disabled={isDeleting}
                                >
                                    <FaTimes /> Cancel
                                </button>
                                <button
                                    className="confirm-delete-btn"
                                    onClick={handleDeleteMaintenance}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <>
                                            <span className="spinner-small"></span>
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <FaTrash /> Yes, Delete with Rollback
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    const getFilteredRecords = () => {
        let filtered = maintenanceRecords.filter(record =>
            record.flatNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.memberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.maintenanceNo?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filterMonth) {
            filtered = filtered.filter(record => {
                return record.maintenanceMonth === parseInt(filterMonth);
            });
        }

        if (filterYear) {
            filtered = filtered.filter(record => {
                return record.maintenanceYear === parseInt(filterYear);
            });
        }

        if (filterType) {
            filtered = filtered.filter(record => record.memberType === filterType);
        }

        // NEW: Filter by payment status
        if (filterStatus) {
            filtered = filtered.filter(record => {
                if (filterStatus === "paid") {
                    return record.pendingAmount === 0;
                } else if (filterStatus === "pending") {
                    return record.pendingAmount > 0;
                }
                return true;
            });
        }

        return filtered;
    };

    const filteredRecords = getFilteredRecords();

    /* ================= STATISTICS ================= */
    const getStatistics = () => {
        const stats = {
            totalAmount: 0,
            collectedAmount: 0,
            pendingAmount: 0,
            totalRecords: filteredRecords.length
        };

        filteredRecords.forEach(record => {
            stats.totalAmount += record.totalMaintenanceAmount || 0;
            stats.collectedAmount += record.collectionAmount || 0;
            stats.pendingAmount += record.pendingAmount || 0;
        });

        return stats;
    };

    const statistics = getStatistics();

    /* ================= CLEAR FILTERS ================= */
    const clearFilters = () => {
        setSearchTerm("");
        setFilterMonth("");
        setFilterYear("");
        setFilterType("");
        setFilterStatus("");
    };

    /* ================= MONTHS AND YEARS FOR SELECT ================= */
    const months = Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1),
        label: new Date(0, i).toLocaleString('default', { month: 'long' })
    }));

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => ({
        value: String(currentYear - i),
        label: String(currentYear - i)
    }));

    return (
        <Navbar>
            <ToastContainer
                position="top-center"
                autoClose={8000}
                style={{ zIndex: 99999 }}
            />
            <div className="maintenance-container">

                {/* PAGE HEADER WITH FILTERS */}
                <div className="maintain-page-header">
                    <div className="header-controls">
                        <div className="search-container">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search by flat, name or maintenance no..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        <div className="action-buttons-group">
                            <button
                                className="export-btn"
                                onClick={exportToExcel}
                                disabled={isExportingExcel || filteredRecords.length === 0}
                            >
                                {isExportingExcel ? (
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
                                <FaPlus /> {showForm ? "Close Form" : "New Maintenance"}
                            </button>
                        </div>
                    </div>

                    {/* FILTERS ROW - ALWAYS VISIBLE */}
                    <div className="filters-panel">
                        <div className="filters-grid">
                            <div className="filter-group">
                                <label>
                                    <FaCalendar /> Month
                                </label>
                                <select
                                    value={filterMonth}
                                    onChange={(e) => setFilterMonth(e.target.value)}
                                >
                                    <option value="">All Months</option>
                                    {months.map(month => (
                                        <option key={month.value} value={month.value}>
                                            {month.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>
                                    <FaCalendar /> Year
                                </label>
                                <select
                                    value={filterYear}
                                    onChange={(e) => setFilterYear(e.target.value)}
                                >
                                    <option value="">All Years</option>
                                    {years.map(year => (
                                        <option key={year.value} value={year.value}>
                                            {year.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>
                                    <FaUser /> Member Type
                                </label>
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                >
                                    <option value="">All Types</option>
                                    <option value="OWNER">Owner</option>
                                    <option value="RENT">Rent</option>
                                    <option value="SHOP">Shop</option>
                                    <option value="CLOSE">Close</option>
                                </select>
                            </div>


                            <div className="filter-group">
                                <label>
                                    <FaMoneyBillWave /> Payment Status
                                </label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="">All Status</option>
                                    <option value="paid">Paid (₹0 Pending)</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>

                            <div className="filter-actions">
                                <button className="clear-btn" onClick={clearFilters}>
                                    <FaTimes /> Clear Filters
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAINTENANCE FORM */}
                {showForm && (
                    <div className="form-container premium">
                        <h2>
                            <FaMoneyBillWave /> New Maintenance Entry
                        </h2>

                        <Formik
                            initialValues={initialValues}
                            validationSchema={validationSchema}
                            validate={(values) => {
                                const errors = {};
                                const member = selectedMember?.data;

                                // REMOVE THE ENTIRE NEW READING VALIDATION BLOCK!
                                // Just keep basic validation
                                if (member && values.newReadingUnits !== undefined) {
                                    // Only check for negative numbers
                                    if (values.newReadingUnits < 0) {
                                        errors.newReadingUnits = "New reading cannot be negative";
                                    }
                                }

                                // Calculate total maintenance for collection validation
                                if (member && values.newReadingUnits !== undefined && values.collectionAmount !== undefined) {
                                    const previousUnit = member.unitsUsed || 0;
                                    const totalUnits = Math.max(0, values.newReadingUnits - previousUnit);

                                    // Get correct fixed rate based on member type
                                    let fixedMaintenance = 0;
                                    if (member.type === "OWNER") {
                                        fixedMaintenance = rates.ownerRate || 0;
                                    } else if (member.type === "RENT") {
                                        fixedMaintenance = rates.rentRate || 0;
                                    } else if (member.type === "SHOP") {
                                        fixedMaintenance = rates.shopRate || 0;
                                    } else if (member.type === "CLOSE") {
                                        fixedMaintenance = rates.closeRate || 0;
                                    }

                                    const waterAmount = totalUnits * rates.waterRate;
                                    const previousPending = member.pendingAmount || 0;
                                    const totalMaintenance = waterAmount + fixedMaintenance + previousPending + Number(values.fineAmount || 0);

                                    // Allow collection amount = 0
                                    const collectionAmt = Number(values.collectionAmount) || 0;

                                    if (collectionAmt > totalMaintenance) {
                                        errors.collectionAmount = `Collection amount (₹${collectionAmt}) cannot exceed total due (₹${totalMaintenance.toFixed(2)})`;
                                    }

                                    if (values.collectionAmount === "" && values.collectionAmount !== 0) {
                                        errors.collectionAmount = "Collection amount is required";
                                    }
                                }

                                return errors;
                            }}
                            onSubmit={handleSubmit}
                        >
                            {({ values, setFieldValue, setFieldTouched }) => {
                                const member = selectedMember?.data;
                                const totals = calculateTotals(values, member);

                                return (
                                    <Form>
                                        {/* MONTH AND YEAR SELECTION */}
                                        <div className="form-row">
                                            <div className="form-field">
                                                <label htmlFor="maintenanceMonth">
                                                    <FaCalendarAlt /> Maintenance Month *
                                                </label>
                                                <Field
                                                    as="select"
                                                    name="maintenanceMonth"
                                                    id="maintenanceMonth"
                                                >
                                                    <option value="">Select Month</option>
                                                    {months.map(month => (
                                                        <option key={month.value} value={month.value}>
                                                            {month.label}
                                                        </option>
                                                    ))}
                                                </Field>
                                                <ErrorMessage name="maintenanceMonth" component="div" className="error" />
                                            </div>

                                            <div className="form-field">
                                                <label htmlFor="maintenanceYear">
                                                    <FaCalendarAlt /> Maintenance Year *
                                                </label>
                                                <Field
                                                    as="select"
                                                    name="maintenanceYear"
                                                    id="maintenanceYear"
                                                >
                                                    <option value="">Select Year</option>
                                                    {years.map(year => (
                                                        <option key={year.value} value={year.value}>
                                                            {year.label}
                                                        </option>
                                                    ))}
                                                </Field>
                                                <ErrorMessage name="maintenanceYear" component="div" className="error" />
                                            </div>
                                        </div>

                                        {/* COLLECTION DATE */}
                                        <div className="form-row">
                                            <div className="form-field">
                                                <label htmlFor="collectionDate">
                                                    <FaCalendarAlt /> Collection Date *
                                                </label>
                                                <Field
                                                    type="date"
                                                    name="collectionDate"
                                                    id="collectionDate"
                                                />
                                                <ErrorMessage name="collectionDate" component="div" className="error" />
                                            </div>
                                        </div>

                                        {/* FLAT SELECTION */}
                                        {/* FLAT SELECTION */}
                                        <div className="form-row">
                                            <div className="form-field">
                                                <label htmlFor="memberId">
                                                    <FaHome /> Select Flat *
                                                </label>
                                                <Select
                                                    options={memberOptions}
                                                    value={memberOptions.find(opt => opt.value === values.memberId)}
                                                    onChange={(option) => {
                                                        setFieldValue("memberId", option?.value || "");
                                                        setSelectedMember(option);

                                                        // AUTO-SET NEW READING TO PREVIOUS READING IMMEDIATELY
                                                        if (option?.data) {
                                                            const previousUnit = option.data.unitsUsed || 0;
                                                            setFieldValue("newReadingUnits", previousUnit);

                                                            // Also auto-set collection amount to 0 for convenience
                                                            setFieldValue("collectionAmount", 0);
                                                        }
                                                    }}
                                                    onBlur={() => setFieldTouched("memberId", true)}
                                                    placeholder="Search for flat number..."
                                                    isClearable
                                                    className="react-select-container"
                                                    classNamePrefix="react-select"
                                                />
                                                <ErrorMessage name="memberId" component="div" className="error" />
                                                {/* Add note about auto-fill */}
                                                {selectedMember?.data && (
                                                    <div className="form-note">
                                                        <FaInfoCircle style={{ marginRight: '5px' }} />
                                                        New reading auto-filled to previous value ({selectedMember.data.unitsUsed || 0})
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* MEMBER INFO */}
                                        {member && totals && (
                                            <>
                                                <div className="info-card">
                                                    <h4>
                                                        <FaUser /> Member Information
                                                    </h4>
                                                    <div className="info-grid">
                                                        <div className="info-item">
                                                            <span className="info-label">Name:</span>
                                                            <span className="info-value">{member.name}</span>
                                                        </div>
                                                        <div className="info-item">
                                                            <span className="info-label">Type:</span>
                                                            <span className={`info-value badge ${member.type.toLowerCase()}`}>
                                                                {member.type}
                                                            </span>
                                                        </div>
                                                        <div className="info-item">
                                                            <span className="info-label">Previous Units:</span>
                                                            <span className="info-value">{totals.previousUnit}</span>
                                                        </div>
                                                        <div className="info-item">
                                                            <span className="info-label">Previous Pending:</span>
                                                            <span className="info-value amount">₹{member.pendingAmount || 0}</span>
                                                        </div>
                                                        {member.mobile && (
                                                            <div className="info-item">
                                                                <span className="info-label">Mobile:</span>
                                                                <span className="info-value">
                                                                    {member.mobile}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {member.email && (
                                                            <div className="info-item">
                                                                <span className="info-label">Email:</span>
                                                                <span className="info-value">
                                                                    {member.email}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* NEW READING */}
                                                <div className="form-row">
                                                    <div className="form-field">
                                                        <label htmlFor="newReadingUnits">
                                                            <FaTachometerAlt /> New Reading Units *
                                                            {member && (member.type === "SHOP" || member.type === "CLOSE") && (
                                                                <span className="note-small"> (Previous reading shown by default)</span>
                                                            )}
                                                        </label>
                                                        <Field
                                                            type="number"
                                                            name="newReadingUnits"
                                                            id="newReadingUnits"
                                                            placeholder={`Enter new reading (Previous: ${totals?.previousUnit || 0})`}
                                                            min="0"
                                                        />
                                                        {/* ADD THIS - SET DEFAULT VALUE WHEN MEMBER IS SELECTED */}
                                                        {member && values.newReadingUnits === "" && (
                                                            <button
                                                                type="button"
                                                                className="set-default-btn"
                                                                onClick={() => setFieldValue("newReadingUnits", totals?.previousUnit || 0)}
                                                            >
                                                                Set to previous reading ({totals?.previousUnit || 0})
                                                            </button>
                                                        )}
                                                        <div className="form-note">
                                                            Previous reading: {totals?.previousUnit || 0}
                                                            {totals?.previousUnit === 0 && " - You can enter 0 or any number"}
                                                            {totals?.previousUnit > 0 && " - You can enter any number (0, same, or higher)"}
                                                        </div>
                                                        <ErrorMessage name="newReadingUnits" component="div" className="error" />
                                                    </div>
                                                </div>

                                                {/* CALCULATION PREVIEW - SHOW EVEN WHEN VALUE IS 0 */}
                                                {values.newReadingUnits !== "" && values.newReadingUnits !== undefined && (
                                                    <div className="calculation-card">
                                                        <h4>
                                                            <FaWater /> Water Usage Calculation
                                                        </h4>
                                                        <div className="calc-grid">
                                                            <div className="calc-item">
                                                                <span className="calc-label">Previous Units:</span>
                                                                <span className="calc-value">{totals.previousUnit}</span>
                                                            </div>
                                                            <div className="calc-item">
                                                                <span className="calc-label">New Units:</span>
                                                                <span className="calc-value">{values.newReadingUnits}</span>
                                                            </div>
                                                            <div className="calc-item">
                                                                <span className="calc-label">Total Units:</span>
                                                                <span className="calc-value badge">{totals.totalUnits}</span>
                                                            </div>
                                                            <div className="calc-item">
                                                                <span className="calc-label">Water Rate:</span>
                                                                <span className="calc-value">₹{rates.waterRate}/unit</span>
                                                            </div>
                                                            <div className="calc-item total">
                                                                <span className="calc-label">Water Amount:</span>
                                                                <span className="calc-value amount">₹{totals.waterAmount.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* FINE SECTION */}
                                                <div className="form-row">
                                                    <div className="form-field">
                                                        <label htmlFor="fineAmount">
                                                            <FaExclamationTriangle /> Fine Amount (Optional)
                                                        </label>
                                                        <Field
                                                            type="number"
                                                            name="fineAmount"
                                                            id="fineAmount"
                                                            placeholder="Enter fine amount"
                                                            min="0"
                                                        />
                                                        <ErrorMessage name="fineAmount" component="div" className="error" />
                                                    </div>

                                                    <div className="form-field">
                                                        <label htmlFor="fineReason">Fine Reason</label>
                                                        <Field
                                                            type="text"
                                                            name="fineReason"
                                                            id="fineReason"
                                                            placeholder="Reason for fine"
                                                        />
                                                        <ErrorMessage name="fineReason" component="div" className="error" />
                                                    </div>
                                                </div>

                                                {/* ENHANCED SUMMARY CARD */}
                                                {(values.newReadingUnits !== undefined || values.fineAmount) && (
                                                    <div className="enhanced-summary-card">
                                                        <h4>
                                                            <FaChartBar /> Maintenance Breakdown
                                                        </h4>
                                                        <div className="breakdown-grid">
                                                            <div className="breakdown-item">
                                                                <span className="breakdown-label">Water Amount:</span>
                                                                <span className="breakdown-value">₹{totals.waterAmount.toFixed(2)}</span>
                                                            </div>
                                                            <div className="breakdown-item">
                                                                <span className="breakdown-label">Fixed Maintenance:</span>
                                                                <span className="breakdown-value">₹{totals.fixedMaintenance.toFixed(2)}</span>
                                                            </div>
                                                            <div className="breakdown-item">
                                                                <span className="breakdown-label">Previous Pending:</span>
                                                                <span className="breakdown-value">₹{member.pendingAmount || 0}</span>
                                                            </div>
                                                            {values.fineAmount > 0 && (
                                                                <div className="breakdown-item">
                                                                    <span className="breakdown-label">Fine Amount:</span>
                                                                    <span className="breakdown-value error">₹{values.fineAmount}</span>
                                                                </div>
                                                            )}
                                                            <div className="breakdown-total">
                                                                <span className="breakdown-label">Total Maintenance Due:</span>
                                                                <span className="breakdown-value amount total">₹{totals.totalMaintenance.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* COLLECTION AMOUNT */}
                                                <div className="form-row">
                                                    <div className="form-field">
                                                        <label htmlFor="collectionAmount">
                                                            <FaRupeeSign /> Collection Amount *
                                                        </label>
                                                        <Field
                                                            type="number"
                                                            name="collectionAmount"
                                                            id="collectionAmount"
                                                            placeholder={`Enter amount collected (max: ₹${totals?.totalMaintenance?.toFixed(2) || 0})`}
                                                            min="0"
                                                            max={totals?.totalMaintenance || 0}
                                                            step="0.01"
                                                        />
                                                        <ErrorMessage name="collectionAmount" component="div" className="error" />
                                                        <div className="form-note">
                                                            Note: You can enter 0 as collection amount if no payment received
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* FINAL PENDING */}
                                                {values.collectionAmount !== undefined && (
                                                    <div className="pending-card">
                                                        <div className="pending-item">
                                                            <span className="pending-label">Total Due:</span>
                                                            <span className="pending-value">₹{totals.totalMaintenance.toFixed(2)}</span>
                                                        </div>
                                                        <div className="pending-item">
                                                            <span className="pending-label">Amount Collected:</span>
                                                            <span className={`pending-value ${Number(values.collectionAmount) > 0 ? 'success' : ''}`}>
                                                                ₹{Number(values.collectionAmount) || 0}
                                                            </span>
                                                        </div>
                                                        <div className="pending-item total">
                                                            <span className="pending-label">New Pending Amount:</span>
                                                            <span className="pending-value pending">₹{totals.pendingAmount.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* SUBMIT BUTTON */}
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !member || values.newReadingUnits === undefined || values.newReadingUnits === "" || values.collectionAmount === undefined}
                                            className="submit-btn"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <FaSpinner className="spinner" /> Creating Maintenance...
                                                </>
                                            ) : (
                                                <>
                                                    <FaCheckCircle /> Create Maintenance
                                                </>
                                            )}
                                        </button>
                                    </Form>
                                );
                            }}
                        </Formik>
                    </div>
                )}

                {/* MAINTENANCE RECORDS TABLE */}
                <div className="data-table-container">
                    <div className="table-header">
                        <h3>
                            <FaCog /> Maintenance Records ({filteredRecords.length})
                            {filterMonth && ` • Month: ${new Date(0, filterMonth - 1).toLocaleString('default', { month: 'long' })}`}
                            {filterYear && ` • Year: ${filterYear}`}
                            {filterType && ` • Type: ${filterType}`}
                            {/* NEW: Show payment status filter */}
                            {filterStatus && ` • Status: ${filterStatus === "paid" ? "Paid" : "Pending"}`}
                        </h3>
                        {(filterMonth || filterYear || filterType || filterStatus || searchTerm) && (
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
                                <p>Loading maintenance records...</p>
                            </div>
                        ) : filteredRecords.length === 0 ? (
                            <div className="empty-state">
                                <p>No maintenance records found{searchTerm || filterMonth || filterYear || filterType ? ' matching your criteria' : ''}</p>
                                {(searchTerm || filterMonth || filterYear || filterType) && (
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
                                        <th>Maintenance No</th>
                                        <th>Month/Year</th>
                                        <th>Flat No</th>
                                        <th>Member</th>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Total Amount</th>
                                        <th>Collected</th>
                                        <th>Pending</th>
                                        {/* <th>Actions</th>  */}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRecords.map(record => (
                                        <tr
                                            key={record.maintenanceId}
                                            className={`clickable-row ${selectedRecord?.maintenanceId === record.maintenanceId ? 'selected' : ''}`}
                                            onClick={() => setSelectedRecord(record)}
                                        >
                                            <td>
                                                <div className="maintenance-no">
                                                    <FaCog className="icon" />
                                                    {record.maintenanceNo}
                                                </div>
                                            </td>
                                            <td className="month-cell">
                                                <div className="month-badge">
                                                    {record.maintenanceMonth}/{record.maintenanceYear}
                                                </div>
                                            </td>
                                            <td className="flat-cell">{record.flatNo}</td>
                                            <td className="name-cell">{record.memberName}</td>
                                            <td className="date-cell">
                                                {new Date(record.collectionDate).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <span className={`type-badge ${record.memberType.toLowerCase()}`}>
                                                    {record.memberType}
                                                </span>
                                            </td>
                                            <td className="amount-cell total">₹{record.totalMaintenanceAmount}</td>
                                            <td className="amount-cell success">₹{record.collectionAmount}</td>
                                            <td className="amount-cell pending">₹{record.pendingAmount}</td>
                                            {/* <td className="actions-cell">
                                                <div className="table-actions">
                                                    <button
                                                        className="action-btn view-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedRecord(record);
                                                        }}
                                                        title="View Details"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    <button
                                                        className="action-btn update-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openUpdateModal(record);
                                                        }}
                                                        title="Update"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                </div>
                                            </td> */}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* MODALS */}
                {selectedRecord && <RecordModal record={selectedRecord} />}
                {showUpdateModal && maintenanceToUpdate && <UpdateModal maintenance={maintenanceToUpdate} />}

                {/* HIDDEN PRINT COMPONENT */}
                <div style={{ position: "absolute", left: "-9999px", top: 0, visibility: "hidden" }}>
                    {maintenanceForPrint && <MaintenancePrint maintenance={maintenanceForPrint.maintenance} />}
                </div>
            </div>
        </Navbar>
    );
};

export default Maintenance;