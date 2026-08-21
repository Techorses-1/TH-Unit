const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const maintenanceSchema = new mongoose.Schema(
    {
        maintenanceId: {
            type: String,
            default: uuidv4,
            unique: true,
        },

        maintenanceNo: {
            type: String,
            required: true,
            unique: true,
        },

        /* MONTH/YEAR FOR VALIDATION */
        maintenanceMonth: {
            type: Number, // 1-12
            required: true,
            min: 1,
            max: 12,
        },
        maintenanceYear: {
            type: Number, // e.g., 2024, 2025
            required: true,
        },

        collectionDate: {
            type: Date,
            required: true,
        },

        /* MEMBER SNAPSHOT */
        memberId: { type: String, required: true },
        flatNo: { type: String, required: true },
        memberType: {
            type: String,
            enum: ["OWNER", "RENT", "SHOP", "CLOSE"],
            required: true,
        },
        memberName: { type: String, required: true },
        memberMobile: { type: String, default: "" },
        memberEmail: { type: String, default: "" },

        /* WATER */
        previousUnitUsed: { type: Number, required: true },
        newReadingUnits: { type: Number, required: true },
        totalUnits: { type: Number, required: true },

        waterUnitRate: { type: Number, required: true },
        waterMaintenanceAmount: { type: Number, required: true },

        /* MAINTENANCE */
        fixedMaintenanceRate: { type: Number, required: true },
        fixedMaintenanceAmount: { type: Number, required: true },

        /* PENALTY */
        fineAmount: { type: Number, default: 0 },
        fineReason: { type: String },

        /* PAYMENT */
        previousPendingAmount: { type: Number, default: 0 },
        totalMaintenanceAmount: { type: Number, required: true },
        collectionAmount: { type: Number, required: true },
        pendingAmount: { type: Number, required: true },

        /* UPDATE TRACKING */
        lastUpdated: { type: Date, default: Date.now },
        updateHistory: [
            {
                updatedAt: { type: Date, default: Date.now },
                updatedBy: { type: String, default: "admin" },
                changes: { type: Object },
                reason: { type: String },
            },
        ],
    },
    { timestamps: true }
);

// Index for duplicate prevention (one maintenance per flat per month)
maintenanceSchema.index(
    { flatNo: 1, maintenanceMonth: 1, maintenanceYear: 1 },
    { unique: true, name: "unique_maintenance_per_month" }
);

maintenanceSchema.index({ maintenanceNo: 1 });
maintenanceSchema.index({ memberId: 1 });
maintenanceSchema.index({ flatNo: 1 });
maintenanceSchema.index({ maintenanceMonth: 1, maintenanceYear: 1 });

module.exports = mongoose.model("Maintenance", maintenanceSchema);