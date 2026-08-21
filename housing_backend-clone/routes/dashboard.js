const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const Maintenance = require("../models/Maintenance");
const Member = require("../models/member");

/* ================= GET DASHBOARD DATA ================= */
router.get("/data", async (req, res) => {
    try {
        // Get query parameters for filtering
        const { year, month } = req.query;
        const filterYear = year && year !== "ALL" ? parseInt(year) : null; // null = all years
        const filterMonth = month && month !== "ALL" ? parseInt(month) : null; // null = all months

        // Build date filters
        let maintenanceDateFilter = {};
        let expenseDateFilter = {};

        // For maintenance: If specific year, use collectionDate; if all years, no date filter
        if (filterYear) {
            const yearStart = new Date(filterYear, 0, 1);
            const yearEnd = new Date(filterYear + 1, 0, 1);
            maintenanceDateFilter.collectionDate = { $gte: yearStart, $lt: yearEnd };
            expenseDateFilter.createdAt = { $gte: yearStart, $lt: yearEnd };
        }

        // For expenses: If specific month across all years, use month filter
        if (filterMonth && !filterYear) {
            expenseDateFilter.$expr = {
                $eq: [{ $month: "$createdAt" }, filterMonth]
            };
        }

        /* ================= SUMMARY CARDS ================= */

        // 1. Total Maintenance Collected
        let maintenanceMatch = { ...maintenanceDateFilter };
        if (filterMonth) {
            maintenanceMatch.maintenanceMonth = filterMonth;
        }

        const maintenanceData = await Maintenance.aggregate([
            { $match: maintenanceMatch },
            {
                $group: {
                    _id: null,
                    totalMaintenance: { $sum: "$fixedMaintenanceAmount" },
                    totalWater: { $sum: "$waterMaintenanceAmount" },
                    totalCollected: { $sum: "$collectionAmount" }
                }
            }
        ]);

        const totalMaintenanceCollected = maintenanceData[0] ?
            (maintenanceData[0].totalMaintenance + maintenanceData[0].totalWater) : 0;
        const totalCollectedAmount = maintenanceData[0]?.totalCollected || 0;

        // 2. Total Expenses
        const expenseData = await Expense.aggregate([
            { $match: expenseDateFilter },
            {
                $group: {
                    _id: null,
                    totalExpenses: { $sum: "$amount" }
                }
            }
        ]);
        const totalExpenses = expenseData[0]?.totalExpenses || 0;

        // 3. Pending Maintenance Collection (Total pending amount - ALWAYS ALL TIME)
        const pendingMaintenanceData = await Member.aggregate([
            {
                $group: {
                    _id: null,
                    totalPending: { $sum: "$pendingAmount" },
                    totalFlats: { $sum: 1 }
                }
            }
        ]);
        const pendingMaintenanceAmount = pendingMaintenanceData[0]?.totalPending || 0;
        const totalFlats = pendingMaintenanceData[0]?.totalFlats || 0;

        // 4. Pending Expense Bills (Count - filter by year/month if specified)
        let pendingExpenseMatch = { paymentStatus: "PENDING" };
        
        if (filterYear) {
            const yearStart = new Date(filterYear, 0, 1);
            const yearEnd = new Date(filterYear + 1, 0, 1);
            pendingExpenseMatch.createdAt = { $gte: yearStart, $lt: yearEnd };
        }
        
        if (filterMonth) {
            if (!pendingExpenseMatch.$expr) pendingExpenseMatch.$expr = {};
            pendingExpenseMatch.$expr.$eq = [{ $month: "$createdAt" }, filterMonth];
        }

        const pendingExpensesCount = await Expense.countDocuments(pendingExpenseMatch);

        /* ================= CHARTS DATA ================= */

        // Chart 1: Monthly Maintenance Collection
        let monthlyMaintenance;
        if (filterYear) {
            // Specific year
            monthlyMaintenance = await Maintenance.aggregate([
                {
                    $match: {
                        maintenanceYear: filterYear
                    }
                },
                {
                    $group: {
                        _id: "$maintenanceMonth",
                        totalMaintenance: { $sum: "$fixedMaintenanceAmount" },
                        totalWater: { $sum: "$waterMaintenanceAmount" },
                        totalCollected: { $sum: "$collectionAmount" }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
        } else {
            // All years - group by month only (across all years)
            monthlyMaintenance = await Maintenance.aggregate([
                {
                    $group: {
                        _id: "$maintenanceMonth",
                        totalMaintenance: { $sum: "$fixedMaintenanceAmount" },
                        totalWater: { $sum: "$waterMaintenanceAmount" },
                        totalCollected: { $sum: "$collectionAmount" }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
        }

        // Format monthly maintenance data
        const monthlyMaintenanceChart = Array.from({ length: 12 }, (_, i) => {
            const monthData = monthlyMaintenance.find(m => m._id === i + 1);
            return {
                month: i + 1,
                monthName: new Date(filterYear || 2000, i).toLocaleString('default', { month: 'short' }),
                totalMaintenance: monthData?.totalMaintenance || 0,
                totalWater: monthData?.totalWater || 0,
                totalCollected: monthData?.totalCollected || 0
            };
        });

        // Chart 2: Monthly Expenses
        let monthlyExpenses;
        if (filterYear) {
            // Specific year
            const yearStart = new Date(filterYear, 0, 1);
            const yearEnd = new Date(filterYear + 1, 0, 1);
            
            monthlyExpenses = await Expense.aggregate([
                {
                    $match: {
                        createdAt: { $gte: yearStart, $lt: yearEnd }
                    }
                },
                {
                    $group: {
                        _id: { $month: "$createdAt" },
                        totalExpenses: { $sum: "$amount" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
        } else {
            // All years - group by month only
            monthlyExpenses = await Expense.aggregate([
                {
                    $group: {
                        _id: { $month: "$createdAt" },
                        totalExpenses: { $sum: "$amount" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
        }

        // Format monthly expenses data
        const monthlyExpensesChart = Array.from({ length: 12 }, (_, i) => {
            const monthData = monthlyExpenses.find(e => e._id === i + 1);
            return {
                month: i + 1,
                monthName: new Date(filterYear || 2000, i).toLocaleString('default', { month: 'short' }),
                totalExpenses: monthData?.totalExpenses || 0,
                expenseCount: monthData?.count || 0
            };
        });

        // Chart 3: Yearly Maintenance vs Expenses
        // Get available years for comparison
        const maintenanceYears = await Maintenance.distinct("maintenanceYear");
        const expenseYears = await Expense.aggregate([
            {
                $group: {
                    _id: { $year: "$createdAt" }
                }
            }
        ]);
        
        const allYearsSet = new Set([
            ...maintenanceYears,
            ...expenseYears.map(e => e._id)
        ].filter(Boolean));
        
        let yearsToShow;
        if (filterYear) {
            // Show current and previous 2 years when a specific year is selected
            yearsToShow = [filterYear - 2, filterYear - 1, filterYear].filter(y => y > 0);
        } else {
            // Show all available years when "All Years" is selected
            yearsToShow = Array.from(allYearsSet).sort((a, b) => a - b);
        }

        const yearlyComparison = await Promise.all(
            yearsToShow.map(async (year) => {
                const yearStart = new Date(year, 0, 1);
                const yearEnd = new Date(year + 1, 0, 1);

                // Yearly maintenance
                const yearMaintenance = await Maintenance.aggregate([
                    {
                        $match: {
                            collectionDate: { $gte: yearStart, $lt: yearEnd }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalMaintenance: { $sum: "$fixedMaintenanceAmount" },
                            totalWater: { $sum: "$waterMaintenanceAmount" }
                        }
                    }
                ]);

                // Yearly expenses
                const yearExpenses = await Expense.aggregate([
                    {
                        $match: {
                            createdAt: { $gte: yearStart, $lt: yearEnd }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalExpenses: { $sum: "$amount" }
                        }
                    }
                ]);

                return {
                    year,
                    totalMaintenance: (yearMaintenance[0]?.totalMaintenance || 0) + (yearMaintenance[0]?.totalWater || 0),
                    totalExpenses: yearExpenses[0]?.totalExpenses || 0
                };
            })
        );

        // Chart 4: Pending Amount Overview (Donut Chart) - ALWAYS ALL TIME
        const pendingOverview = {
            maintenancePending: pendingMaintenanceAmount,
            expensePending: await Expense.aggregate([
                { $match: { paymentStatus: "PENDING" } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$amount" }
                    }
                }
            ]).then(result => result[0]?.total || 0),
            totalFlats: totalFlats,
            flatsWithPending: await Member.countDocuments({ pendingAmount: { $gt: 0 } })
        };

        /* ================= ADDITIONAL INSIGHTS ================= */

        // Recent Maintenance Collections (last 5)
        let recentMaintenanceQuery = Maintenance.find();
        if (filterYear) {
            const yearStart = new Date(filterYear, 0, 1);
            const yearEnd = new Date(filterYear + 1, 0, 1);
            recentMaintenanceQuery = recentMaintenanceQuery.where('collectionDate').gte(yearStart).lt(yearEnd);
        }
        if (filterMonth) {
            recentMaintenanceQuery = recentMaintenanceQuery.where('maintenanceMonth', filterMonth);
        }
        
        const recentMaintenance = await recentMaintenanceQuery
            .sort({ collectionDate: -1 })
            .limit(5)
            .select('maintenanceNo flatNo collectionAmount collectionDate maintenanceMonth maintenanceYear')
            .lean();

        // Recent Expenses (last 5)
        let recentExpensesQuery = Expense.find();
        if (filterYear) {
            const yearStart = new Date(filterYear, 0, 1);
            const yearEnd = new Date(filterYear + 1, 0, 1);
            recentExpensesQuery = recentExpensesQuery.where('createdAt').gte(yearStart).lt(yearEnd);
        }
        if (filterMonth && !filterYear) {
            recentExpensesQuery = recentExpensesQuery.where('createdAt').expr({
                $eq: [{ $month: "$createdAt" }, filterMonth]
            });
        }
        
        const recentExpenses = await recentExpensesQuery
            .sort({ createdAt: -1 })
            .limit(5)
            .select('expenseNo description amount paymentStatus createdAt category')
            .lean();

        // Top Expense Categories
        let topCategoriesQuery = Expense.aggregate([
            {
                $match: expenseDateFilter
            },
            {
                $group: {
                    _id: "$category",
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalAmount: -1 } },
            { $limit: 5 }
        ]);

        const topCategories = await topCategoriesQuery;

        /* ================= RESPONSE ================= */
        res.status(200).json({
            success: true,
            data: {
                // Summary Cards
                summary: {
                    totalMaintenanceCollected: totalMaintenanceCollected,
                    totalCollectedAmount: totalCollectedAmount,
                    totalExpenses: totalExpenses,
                    pendingMaintenanceAmount: pendingMaintenanceAmount,
                    pendingExpensesCount: pendingExpensesCount,
                    totalFlats: totalFlats
                },

                // Charts Data
                charts: {
                    monthlyMaintenance: monthlyMaintenanceChart,
                    monthlyExpenses: monthlyExpensesChart,
                    yearlyComparison: yearlyComparison,
                    pendingOverview: pendingOverview
                },

                // Additional Insights
                insights: {
                    recentMaintenance,
                    recentExpenses,
                    topCategories,
                    filter: {
                        year: filterYear,
                        month: filterMonth
                    }
                },

                // Available years for filter dropdown (will include "ALL" from years endpoint)
                availableYears: Array.from(allYearsSet).sort((a, b) => b - a)
            }
        });

    } catch (error) {
        console.error("❌ Dashboard error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard data",
            error: error.message
        });
    }
});

/* ================= GET YEARS LIST ================= */
router.get("/years", async (req, res) => {
    try {
        const maintenanceYears = await Maintenance.distinct("maintenanceYear");
        const expenseYears = await Expense.aggregate([
            {
                $group: {
                    _id: { $year: "$createdAt" }
                }
            }
        ]);

        const allYears = [
            ...maintenanceYears,
            ...expenseYears.map(e => e._id)
        ].filter(Boolean);

        const uniqueYears = [...new Set(allYears)].sort((a, b) => b - a);

        // Add "ALL" at the beginning
        const yearsWithAll = ["ALL", ...uniqueYears];

        res.status(200).json({
            success: true,
            data: yearsWithAll
        });

    } catch (error) {
        console.error("❌ Years fetch error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch years",
            error: error.message
        });
    }
});

module.exports = router;