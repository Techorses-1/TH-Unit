const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const maintenanceArchiveSchema = new mongoose.Schema(
    {
        archiveId: {
            type: String,
            default: uuidv4,
            unique: true,
        },

        // Original maintenance data
        originalMaintenanceId: String,
        maintenanceNo: String,
        collectionDate: Date,
        
        // Member snapshot
        memberId: String,
        flatNo: String,
        memberType: String,
        memberName: String,
        
        // Water data
        previousUnitUsed: Number,
        newReadingUnits: Number,
        totalUnits: Number,
        waterUnitRate: Number,
        waterMaintenanceAmount: Number,
        
        // Maintenance data
        fixedMaintenanceRate: Number,
        fixedMaintenanceAmount: Number,
        
        // Penalty
        fineAmount: Number,
        fineReason: String,
        
        // Payment
        previousPendingAmount: Number,
        totalMaintenanceAmount: Number,
        collectionAmount: Number,
        pendingAmount: Number,
        
        // Archive metadata
        deletedAt: {
            type: Date,
            default: Date.now,
        },
        deletedBy: {
            type: String,
            default: "system",
        },
        reasonForDeletion: {
            type: String,
            default: "Manual deletion",
        },
        
        // Rollback info
        rollbackInfo: {
            memberUnitsRevertedTo: Number,
            memberPendingRevertedTo: Number,
            rollbackTimestamp: Date,
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("MaintenanceArchive", maintenanceArchiveSchema);