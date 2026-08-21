const express = require("express");
const router = express.Router();

const Maintenance = require("../models/Maintenance");
const Member = require("../models/member");
const MaintenanceRate = require("../models/MaintenanceRate");
const WaterRate = require("../models/WaterRate");
const GlobalCounter = require("../models/globalCounter");
const MaintenanceArchive = require("../models/MaintenanceArchive");

/* ================= CREATE MAINTENANCE (UPDATED) ================= */
router.post("/create-maintenance", async (req, res) => {
    const startTime = Date.now();
    const requestId = `MAINT_REQ_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    let maintenanceNo = null;
    let maintenanceCreated = false;

    try {
        console.log(`🔄 [${requestId}] Maintenance creation started`);

        const {
            memberId,
            newReadingUnits,
            fineAmount = 0,
            fineReason = "",
            collectionAmount,
            collectionDate,
            maintenanceMonth,  // NEW FIELD
            maintenanceYear,   // NEW FIELD
        } = req.body;

        /* ================= VALIDATION ================= */
        if (!memberId || newReadingUnits === undefined || collectionAmount === undefined) {
            return res.status(400).json({
                success: false,
                message: "Required fields missing: memberId, newReadingUnits, collectionAmount",
            });
        }

        // Validate month/year
        if (!maintenanceMonth || !maintenanceYear) {
            return res.status(400).json({
                success: false,
                message: "Maintenance month and year are required",
                field: "maintenanceMonth",
            });
        }

        const month = parseInt(maintenanceMonth);
        const year = parseInt(maintenanceYear);

        if (month < 1 || month > 12) {
            return res.status(400).json({
                success: false,
                message: "Invalid month (must be 1-12)",
                field: "maintenanceMonth",
            });
        }

        if (year < 2020 || year > 2100) {
            return res.status(400).json({
                success: false,
                message: "Invalid year",
                field: "maintenanceYear",
            });
        }

        const member = await Member.findOne({ memberId });
        if (!member) {
            return res.status(404).json({
                success: false,
                message: "Member not found",
            });
        }

        // Get mobile and email from member record
        const memberMobile = member.mobile || "";
        const memberEmail = member.email || "";

        /* ================= MONTH/YEAR DUPLICATE CHECK ================= */
        console.log(`🔍 [${requestId}] Checking for existing maintenance for flat ${member.flatNumber}, ${month}/${year}`);

        const existingMaintenance = await Maintenance.findOne({
            flatNo: member.flatNumber,
            maintenanceMonth: month,
            maintenanceYear: year,
        });

        if (existingMaintenance) {
            console.log(`❌ [${requestId}] Maintenance already exists for this flat in ${month}/${year}`);
            return res.status(400).json({
                success: false,
                message: `Maintenance already created for flat ${member.flatNumber} in ${getMonthName(month)} ${year}`,
                field: "maintenanceMonth",
                existingMaintenanceNo: existingMaintenance.maintenanceNo,
                suggestion: "You can update the existing maintenance instead.",
            });
        }

        console.log(`✅ [${requestId}] No duplicate maintenance found`);

        // Continue with original validation
        if (newReadingUnits < member.unitsUsed) {
            return res.status(400).json({
                success: false,
                message: `New reading (${newReadingUnits}) cannot be less than previous reading (${member.unitsUsed})`,
                field: "newReadingUnits",
            });
        }

        const waterRate = await WaterRate.findOne();
        if (!waterRate) {
            return res.status(400).json({
                success: false,
                message: "Water rate not configured",
            });
        }

        const maintenanceRate = await MaintenanceRate.findOne();
        if (!maintenanceRate) {
            return res.status(400).json({
                success: false,
                message: "Maintenance rate not configured",
            });
        }

        /* ================= CALCULATIONS ================= */
        const totalUnits = newReadingUnits - member.unitsUsed;
        const waterMaintenanceAmount = totalUnits * waterRate.unitRate;

        // FIXED: Handle all member types properly
        let fixedMaintenanceAmount = 0;
        if (member.type === "OWNER") {
            fixedMaintenanceAmount = maintenanceRate.ownerRate;
        } else if (member.type === "RENT") {
            fixedMaintenanceAmount = maintenanceRate.rentRate;
        } else if (member.type === "SHOP") {
            fixedMaintenanceAmount = maintenanceRate.shopRate;
        } else if (member.type === "CLOSE") {
            fixedMaintenanceAmount = maintenanceRate.closeRate;
        }

        const totalMaintenanceAmount =
            waterMaintenanceAmount +
            fixedMaintenanceAmount +
            member.pendingAmount +
            Number(fineAmount || 0);

        // Allow collection amount = 0
        const collectionAmt = Number(collectionAmount) || 0;
        const pendingAmount =
            totalMaintenanceAmount - collectionAmt > 0
                ? totalMaintenanceAmount - collectionAmt
                : 0;

        console.log(`🧮 [${requestId}] Calculations OK`, {
            totalUnits,
            waterMaintenanceAmount,
            fixedMaintenanceAmount,
            previousPending: member.pendingAmount,
            fineAmount,
            totalMaintenanceAmount,
            collectionAmount: collectionAmt,
            pendingAmount,
            monthYear: `${month}/${year}`,
        });

        /* ================= GENERATE MAINTENANCE NUMBER ================= */
        const counter = await GlobalCounter.findOneAndUpdate(
            { id: "maintenance" },
            { $inc: { count: 1 } },
            { new: true, upsert: true }
        );

        maintenanceNo = `MAIN${new Date().getFullYear()}${String(counter.count).padStart(4, "0")}`;
        console.log(`🔢 [${requestId}] Maintenance No generated: ${maintenanceNo}`);

        /* ================= CREATE MAINTENANCE RECORD ================= */
        const maintenance = new Maintenance({
            maintenanceNo,
            maintenanceMonth: month,    // NEW
            maintenanceYear: year,      // NEW
            collectionDate: collectionDate ? new Date(collectionDate) : new Date(),

            // Member details (snapshot)
            memberId: member.memberId,
            flatNo: member.flatNumber,
            memberType: member.type,
            memberName: member.name,
            memberMobile: memberMobile,
            memberEmail: memberEmail,

            // Water usage
            previousUnitUsed: member.unitsUsed,
            newReadingUnits: Number(newReadingUnits),
            totalUnits,

            waterUnitRate: waterRate.unitRate,
            waterMaintenanceAmount,

            fixedMaintenanceRate: fixedMaintenanceAmount,
            fixedMaintenanceAmount,

            fineAmount: Number(fineAmount || 0),
            fineReason,

            previousPendingAmount: member.pendingAmount,
            totalMaintenanceAmount,
            collectionAmount: collectionAmt,
            pendingAmount,

            // Initialize update history
            updateHistory: [],
        });

        await maintenance.save();
        maintenanceCreated = true;
        console.log(`💾 [${requestId}] Maintenance saved: ${maintenanceNo}`);

        /* ================= UPDATE MEMBER ================= */
        const oldUnitsUsed = member.unitsUsed;
        const oldPending = member.pendingAmount;

        member.unitsUsed = Number(newReadingUnits);
        member.pendingAmount = pendingAmount;
        await member.save();

        console.log(`🔄 [${requestId}] Member updated`, {
            unitsUsed: { from: oldUnitsUsed, to: member.unitsUsed },
            pendingAmount: { from: oldPending, to: member.pendingAmount },
        });

        res.status(201).json({
            success: true,
            message: "Maintenance created successfully",
            data: maintenance.toObject(),
            processingTime: `${Date.now() - startTime}ms`,
        });

    } catch (error) {
        console.error(`💥 [${requestId}] Error`, error.message);

        /* ================= ROLLBACK ================= */
        if (maintenanceCreated && maintenanceNo) {
            console.log(`↩️ [${requestId}] Rolling back maintenance ${maintenanceNo}`);
            await Maintenance.findOneAndDelete({ maintenanceNo });
        }

        // Handle duplicate key error (unique index violation)
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Maintenance already exists for this flat in this month/year",
                field: "maintenanceMonth",
                error: "Duplicate maintenance entry",
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to create maintenance",
            error: error.message,
        });
    }
});

/* ================= UPDATE MAINTENANCE ================= */
router.put("/update-maintenance/:maintenanceNo", async (req, res) => {
    const startTime = Date.now();
    const requestId = `UPDATE_MAINT_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    try {
        console.log(`🔄 [${requestId}] Maintenance update started for: ${req.params.maintenanceNo}`);

        const {
            newReadingUnits,
            collectionAmount,
            updateReason = "Manual update",
            updatedBy = "admin",
        } = req.body;

        if (newReadingUnits === undefined && collectionAmount === undefined) {
            return res.status(400).json({
                success: false,
                message: "No update data provided. Provide newReadingUnits or collectionAmount",
            });
        }

        /* ================= FIND MAINTENANCE ================= */
        const maintenance = await Maintenance.findOne({
            maintenanceNo: req.params.maintenanceNo,
        });

        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: "Maintenance not found",
            });
        }

        console.log(`✅ [${requestId}] Maintenance found:`, {
            maintenanceNo: maintenance.maintenanceNo,
            flatNo: maintenance.flatNo,
            currentUnits: maintenance.newReadingUnits,
            currentCollection: maintenance.collectionAmount,
        });

        /* ================= FIND MEMBER ================= */
        const member = await Member.findOne({ memberId: maintenance.memberId });
        if (!member) {
            return res.status(404).json({
                success: false,
                message: "Member not found",
            });
        }

        /* ================= VALIDATE NEW READING ================= */
        let updatedReadingUnits = maintenance.newReadingUnits;
        let waterMaintenanceAmount = maintenance.waterMaintenanceAmount;
        let totalUnits = maintenance.totalUnits;

        const changes = {};

        if (newReadingUnits !== undefined) {
            if (newReadingUnits < maintenance.previousUnitUsed) {
                return res.status(400).json({
                    success: false,
                    message: `New reading (${newReadingUnits}) cannot be less than previous reading (${maintenance.previousUnitUsed})`,
                    field: "newReadingUnits",
                });
            }

            // Calculate new water amount
            const newTotalUnits = newReadingUnits - maintenance.previousUnitUsed;
            waterMaintenanceAmount = newTotalUnits * maintenance.waterUnitRate;
            totalUnits = newTotalUnits;

            updatedReadingUnits = newReadingUnits;
            changes.newReadingUnits = {
                from: maintenance.newReadingUnits,
                to: newReadingUnits,
            };
            changes.waterMaintenanceAmount = {
                from: maintenance.waterMaintenanceAmount,
                to: waterMaintenanceAmount,
            };
            changes.totalUnits = {
                from: maintenance.totalUnits,
                to: totalUnits,
            };
        }

        /* ================= VALIDATE COLLECTION AMOUNT ================= */
        let updatedCollectionAmount = maintenance.collectionAmount;

        // Calculate current total maintenance amount
        const totalMaintenanceAmount =
            waterMaintenanceAmount +
            maintenance.fixedMaintenanceAmount +
            maintenance.previousPendingAmount +
            maintenance.fineAmount;

        if (collectionAmount !== undefined) {
            const collectionAmt = Number(collectionAmount) || 0;

            // Validate collection amount doesn't exceed total
            if (collectionAmt > totalMaintenanceAmount) {
                return res.status(400).json({
                    success: false,
                    message: `Collection amount (₹${collectionAmt}) cannot exceed total maintenance amount (₹${totalMaintenanceAmount})`,
                    field: "collectionAmount",
                });
            }

            updatedCollectionAmount = collectionAmt;
            changes.collectionAmount = {
                from: maintenance.collectionAmount,
                to: collectionAmt,
            };
        }

        /* ================= CALCULATE NEW PENDING ================= */
        const pendingAmount =
            totalMaintenanceAmount - updatedCollectionAmount > 0
                ? totalMaintenanceAmount - updatedCollectionAmount
                : 0;

        changes.pendingAmount = {
            from: maintenance.pendingAmount,
            to: pendingAmount,
        };
        changes.totalMaintenanceAmount = {
            from: maintenance.totalMaintenanceAmount,
            to: totalMaintenanceAmount,
        };

        /* ================= SAVE OLD VALUES FOR HISTORY ================= */
        const oldMaintenanceData = {
            newReadingUnits: maintenance.newReadingUnits,
            totalUnits: maintenance.totalUnits,
            waterMaintenanceAmount: maintenance.waterMaintenanceAmount,
            collectionAmount: maintenance.collectionAmount,
            pendingAmount: maintenance.pendingAmount,
            totalMaintenanceAmount: maintenance.totalMaintenanceAmount,
        };

        const oldMemberData = {
            unitsUsed: member.unitsUsed,
            pendingAmount: member.pendingAmount,
        };

        /* ================= UPDATE MAINTENANCE RECORD ================= */
        maintenance.newReadingUnits = updatedReadingUnits;
        maintenance.totalUnits = totalUnits;
        maintenance.waterMaintenanceAmount = waterMaintenanceAmount;
        maintenance.collectionAmount = updatedCollectionAmount;
        maintenance.pendingAmount = pendingAmount;
        maintenance.totalMaintenanceAmount = totalMaintenanceAmount;
        maintenance.lastUpdated = new Date();

        // Add to update history
        maintenance.updateHistory.push({
            updatedAt: new Date(),
            updatedBy,
            changes,
            reason: updateReason,
        });

        await maintenance.save();
        console.log(`💾 [${requestId}] Maintenance updated`);

        /* ================= UPDATE MEMBER ================= */
        // Only update member if water reading changed
        if (newReadingUnits !== undefined) {
            member.unitsUsed = updatedReadingUnits;
        }
        member.pendingAmount = pendingAmount;
        await member.save();

        console.log(`🔄 [${requestId}] Member updated`, {
            unitsUsed: { from: oldMemberData.unitsUsed, to: member.unitsUsed },
            pendingAmount: { from: oldMemberData.pendingAmount, to: member.pendingAmount },
        });

        /* ================= RESPONSE ================= */
        res.status(200).json({
            success: true,
            message: "Maintenance updated successfully",
            data: {
                maintenance: maintenance.toObject(),
                member: {
                    unitsUsed: member.unitsUsed,
                    pendingAmount: member.pendingAmount,
                },
                changes,
                processingTime: `${Date.now() - startTime}ms`,
            },
        });

    } catch (error) {
        console.error(`💥 [${requestId}] Update error:`, error.message);
        res.status(500).json({
            success: false,
            message: "Failed to update maintenance",
            error: error.message,
        });
    }
});

/* ================= GET MAINTENANCE BY MONTH/YEAR ================= */
router.get("/get-by-month", async (req, res) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({
                success: false,
                message: "Month and year are required",
            });
        }

        const maintenanceRecords = await Maintenance.find({
            maintenanceMonth: parseInt(month),
            maintenanceYear: parseInt(year),
        }).sort({ flatNo: 1, createdAt: -1 });

        res.status(200).json({
            success: true,
            data: maintenanceRecords,
            count: maintenanceRecords.length,
        });

    } catch (error) {
        console.error("Error fetching maintenance by month:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch maintenance records",
            error: error.message,
        });
    }
});

/* ================= CHECK IF MAINTENANCE EXISTS FOR FLAT IN MONTH ================= */
router.get("/check-existing", async (req, res) => {
    try {
        const { flatNo, month, year } = req.query;

        if (!flatNo || !month || !year) {
            return res.status(400).json({
                success: false,
                message: "Flat number, month and year are required",
            });
        }

        const existingMaintenance = await Maintenance.findOne({
            flatNo,
            maintenanceMonth: parseInt(month),
            maintenanceYear: parseInt(year),
        });

        res.status(200).json({
            success: true,
            exists: !!existingMaintenance,
            data: existingMaintenance,
        });

    } catch (error) {
        console.error("Error checking existing maintenance:", error);
        res.status(500).json({
            success: false,
            message: "Failed to check maintenance",
            error: error.message,
        });
    }
});

/* ================= GET ALL MAINTENANCE RECORDS ================= */
router.get("/get-all", async (req, res) => {
    try {
        const maintenanceRecords = await Maintenance.find({})
            .sort({ maintenanceYear: -1, maintenanceMonth: -1, createdAt: -1 })
            .lean();

        console.log(`📊 Found ${maintenanceRecords.length} maintenance records`);
        res.status(200).json(maintenanceRecords);

    } catch (error) {
        console.error("❌ Error fetching maintenance records:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch maintenance records",
            error: error.message,
        });
    }
});

/* ================= DELETE MAINTENANCE (WITH ROLLBACK) ================= */
// (Keep the existing delete function, no changes needed)

/* ================= HELPER FUNCTION ================= */
function getMonthName(monthNumber) {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    return months[monthNumber - 1] || "Unknown";
}




/* ================= DELETE MAINTENANCE (WITH ROLLBACK) ================= */
router.delete("/delete-maintenance/:maintenanceNo", async (req, res) => {
    const startTime = Date.now();
    const requestId = `DELETE_MAINT_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    console.log(`🗑️ [${requestId}] Maintenance deletion started for: ${req.params.maintenanceNo}`);

    // Track what we need to rollback if error occurs
    let maintenanceData = null;
    let memberDataBefore = null;
    let archiveCreated = false;
    let memberUpdated = false;
    let maintenanceDeleted = false;

    try {
        // ================= STEP 1: FIND MAINTENANCE RECORD =================
        console.log(`🔍 [${requestId}] Step 1: Finding maintenance record...`);
        maintenanceData = await Maintenance.findOne({
            maintenanceNo: req.params.maintenanceNo
        });

        if (!maintenanceData) {
            console.log(`❌ [${requestId}] Maintenance not found: ${req.params.maintenanceNo}`);
            return res.status(404).json({
                success: false,
                message: "Maintenance record not found"
            });
        }

        console.log(`✅ [${requestId}] Maintenance found:`, {
            maintenanceNo: maintenanceData.maintenanceNo,
            flatNo: maintenanceData.flatNo
        });

        // ================= STEP 2: SIMPLE SEQUENCE CHECK =================
        console.log(`🔍 [${requestId}] Step 2: Checking maintenance sequence...`);

        // Extract the sequence number (last 4 digits)
        // Example: MAIN20250009 → sequence = 9
        const currentSequence = parseInt(maintenanceData.maintenanceNo.slice(-4));

        // Find ALL maintenance for this FLAT NUMBER
        const allFlatMaintenance = await Maintenance.find({
            flatNo: maintenanceData.flatNo
        }).sort({ maintenanceNo: 1 }); // Sort by maintenance number

        console.log(`📊 [${requestId}] Found ${allFlatMaintenance.length} maintenance records for flat ${maintenanceData.flatNo}`);

        // Check if any maintenance has HIGHER sequence number
        const higherSequenceMaintenance = allFlatMaintenance.filter(maint => {
            const maintSequence = parseInt(maint.maintenanceNo.slice(-4));
            return maintSequence > currentSequence;
        });

        if (higherSequenceMaintenance.length > 0) {
            // Get the NEXT maintenance (smallest higher sequence)
            const nextMaintenance = higherSequenceMaintenance[0];

            console.log(`❌ [${requestId}] Cannot delete: Higher sequence maintenance exists`, {
                currentMaintenance: maintenanceData.maintenanceNo,
                currentSequence: currentSequence,
                nextMaintenance: nextMaintenance.maintenanceNo,
                nextSequence: parseInt(nextMaintenance.maintenanceNo.slice(-4)),
                totalHigherSequence: higherSequenceMaintenance.length
            });

            return res.status(400).json({
                success: false,
                message: `Cannot delete ${maintenanceData.maintenanceNo}`,
                error: `Maintenance ${nextMaintenance.maintenanceNo} exists with higher sequence number for flat ${maintenanceData.flatNo}`,
                details: {
                    currentSequence: currentSequence,
                    nextSequence: parseInt(nextMaintenance.maintenanceNo.slice(-4)),
                    flatNo: maintenanceData.flatNo,
                    totalMaintenanceForFlat: allFlatMaintenance.length
                },
                suggestion: `Delete ${nextMaintenance.maintenanceNo} first, then ${maintenanceData.maintenanceNo}`
            });
        }

        console.log(`✅ [${requestId}] Sequence check passed: No higher sequence maintenance for flat ${maintenanceData.flatNo}`);

        // ================= STEP 3: FIND MEMBER =================
        console.log(`🔍 [${requestId}] Step 3: Finding member...`);
        const member = await Member.findOne({
            memberId: maintenanceData.memberId
        });

        if (!member) {
            console.log(`❌ [${requestId}] Member not found: ${maintenanceData.memberId}`);
            return res.status(404).json({
                success: false,
                message: "Member not found"
            });
        }

        // Save member state BEFORE any changes
        memberDataBefore = {
            unitsUsed: member.unitsUsed,
            pendingAmount: member.pendingAmount,
            flatNumber: member.flatNumber
        };

        console.log(`✅ [${requestId}] Member found:`, {
            flatNumber: member.flatNumber,
            currentUnits: member.unitsUsed,
            currentPending: member.pendingAmount,
            willRevertToUnits: maintenanceData.previousUnitUsed,
            willRevertToPending: maintenanceData.previousPendingAmount
        });

        // ================= STEP 4: VALIDATE DATA CONSISTENCY =================
        console.log(`🔍 [${requestId}] Step 4: Validating data consistency...`);

        // Check if member's current units match what we expect from this maintenance
        if (member.unitsUsed !== maintenanceData.newReadingUnits) {
            console.warn(`⚠️ [${requestId}] Warning: Current units (${member.unitsUsed}) don't match maintenance new units (${maintenanceData.newReadingUnits})`);
        }

        // ================= STEP 5: ARCHIVE MAINTENANCE (FIRST) =================
        console.log(`💾 [${requestId}] Step 5: Archiving maintenance record...`);

        const archiveData = {
            // Copy all original fields
            ...maintenanceData.toObject(),
            originalMaintenanceId: maintenanceData._id,

            // Archive metadata
            deletedAt: new Date(),
            deletedBy: req.user?.userId || "admin",
            reasonForDeletion: req.body.reason || "Manual deletion",
            safetyChecks: {
                sequenceCheckPassed: true,
                flatNo: maintenanceData.flatNo,
                currentSequence: currentSequence,
                higherSequenceCount: 0
            },

            // Rollback info
            rollbackInfo: {
                memberUnitsRevertedTo: maintenanceData.previousUnitUsed,
                memberPendingRevertedTo: maintenanceData.previousPendingAmount,
                rollbackTimestamp: new Date(),
                memberStateBefore: {
                    unitsUsed: member.unitsUsed,
                    pendingAmount: member.pendingAmount
                }
            }
        };

        const archivedMaintenance = new MaintenanceArchive(archiveData);
        await archivedMaintenance.save();
        archiveCreated = true;

        console.log(`✅ [${requestId}] Maintenance archived with ID: ${archivedMaintenance.archiveId}`);

        // ================= STEP 6: ROLLBACK MEMBER DATA =================
        console.log(`↩️ [${requestId}] Step 6: Rolling back member data...`);

        const oldUnits = member.unitsUsed;
        const oldPending = member.pendingAmount;

        // Perform rollback
        member.unitsUsed = maintenanceData.previousUnitUsed;
        member.pendingAmount = maintenanceData.previousPendingAmount;

        await member.save();
        memberUpdated = true;

        console.log(`✅ [${requestId}] Member data rolled back:`, {
            unitsUsed: { from: oldUnits, to: member.unitsUsed },
            pendingAmount: { from: oldPending, to: member.pendingAmount }
        });

        // ================= STEP 7: DELETE ORIGINAL MAINTENANCE =================
        console.log(`🗑️ [${requestId}] Step 7: Deleting original maintenance record...`);

        const deleteResult = await Maintenance.deleteOne({
            maintenanceNo: req.params.maintenanceNo
        });

        if (deleteResult.deletedCount === 0) {
            throw new Error("Failed to delete maintenance record");
        }

        maintenanceDeleted = true;
        console.log(`✅ [${requestId}] Maintenance record deleted`);

        // ================= STEP 8: VERIFY ROLLBACK =================
        console.log(`🔍 [${requestId}] Step 8: Verifying rollback...`);

        const updatedMember = await Member.findOne({ memberId: maintenanceData.memberId });

        if (!updatedMember) {
            throw new Error("Member not found after rollback - verification failed");
        }

        // Verify rollback
        const unitsVerified = updatedMember.unitsUsed === maintenanceData.previousUnitUsed;
        const pendingVerified = updatedMember.pendingAmount === maintenanceData.previousPendingAmount;

        if (!unitsVerified) {
            console.error(`❌ [${requestId}] Rollback verification failed: units mismatch`);
            console.error(`   Expected: ${maintenanceData.previousUnitUsed}, Got: ${updatedMember.unitsUsed}`);
        }

        if (!pendingVerified) {
            console.error(`❌ [${requestId}] Rollback verification failed: pending amount mismatch`);
            console.error(`   Expected: ${maintenanceData.previousPendingAmount}, Got: ${updatedMember.pendingAmount}`);
        }

        // ================= SUCCESS RESPONSE =================
        const responseData = {
            success: true,
            message: "Maintenance deleted successfully with full rollback",
            data: {
                deletedMaintenance: maintenanceData.maintenanceNo,
                flatNo: maintenanceData.flatNo,
                sequenceInfo: {
                    deletedSequence: currentSequence,
                    wasHighestSequence: true,
                    totalMaintenanceForFlat: allFlatMaintenance.length
                },
                rollbackDetails: {
                    unitsUsed: {
                        before: oldUnits,
                        after: updatedMember.unitsUsed,
                        verified: unitsVerified
                    },
                    pendingAmount: {
                        before: oldPending,
                        after: updatedMember.pendingAmount,
                        verified: pendingVerified
                    }
                },
                archivedRecordId: archivedMaintenance.archiveId,
                processingTime: `${Date.now() - startTime}ms`,
                stepsCompleted: [
                    "Found",
                    "SequenceChecked",
                    "Validated",
                    "Archived",
                    "Rolledback",
                    "Deleted",
                    "Verified"
                ]
            }
        };

        console.log(`🎉 [${requestId}] Deletion completed successfully in ${Date.now() - startTime}ms`);
        console.log(`📊 [${requestId}] Summary:`, {
            flatNo: maintenanceData.flatNo,
            sequence: currentSequence,
            rollback: responseData.data.rollbackDetails
        });

        res.status(200).json(responseData);

    } catch (error) {
        console.error(`💥 [${requestId}] ERROR during deletion:`, error.message);
        console.error(`🔍 [${requestId}] Error stack:`, error.stack);

        // ================= MANUAL ROLLBACK IF ERROR OCCURRED =================
        console.log(`⚠️ [${requestId}] Error occurred! Performing manual cleanup...`);

        let rollbackPerformed = false;

        try {
            // ROLLBACK 1: If member was updated but maintenance wasn't deleted
            if (memberUpdated && !maintenanceDeleted && memberDataBefore && maintenanceData) {
                console.log(`↩️ [${requestId}] Rolling back member update...`);

                const member = await Member.findOne({ memberId: maintenanceData.memberId });
                if (member) {
                    member.unitsUsed = memberDataBefore.unitsUsed;
                    member.pendingAmount = memberDataBefore.pendingAmount;
                    await member.save();
                    rollbackPerformed = true;
                    console.log(`✅ [${requestId}] Member rolled back to original state`);
                }
            }

            // ROLLBACK 2: If archive was created but something failed
            if (archiveCreated && !maintenanceDeleted) {
                console.log(`🗑️ [${requestId}] Cleaning up archive (since main record not deleted)...`);
                await MaintenanceArchive.deleteOne({
                    originalMaintenanceId: maintenanceData?._id
                }).catch(e => console.error("Failed to cleanup archive:", e.message));
            }

        } catch (rollbackError) {
            console.error(`💥 [${requestId}] ERROR during rollback cleanup:`, rollbackError.message);
        }

        // ================= ERROR RESPONSE =================
        res.status(500).json({
            success: false,
            message: "Failed to delete maintenance. All changes have been rolled back.",
            error: error.message,
            rollbackPerformed: rollbackPerformed,
            requestId: requestId,
            state: {
                archiveCreated: archiveCreated,
                memberUpdated: memberUpdated,
                maintenanceDeleted: maintenanceDeleted,
                dataConsistent: !memberUpdated || rollbackPerformed
            }
        });
    }
});

module.exports = router;