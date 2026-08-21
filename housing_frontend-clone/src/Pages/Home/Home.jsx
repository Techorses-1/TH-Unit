import React, { useEffect, useState } from "react";
import Navbar from "../../Components/Sidebar/Navbar";
import {
  FiDollarSign,
  FiTrendingUp,
  FiClock,
  FiAlertCircle,
  FiCalendar,
  FiFilter,
  FiBarChart2,
  FiPieChart
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import "./Home.scss";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [yearFilter, setYearFilter] = useState("ALL");
  const [monthFilter, setMonthFilter] = useState("ALL");
  const [availableYears, setAvailableYears] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchAvailableYears();
  }, [yearFilter, monthFilter]);

  const fetchAvailableYears = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/years`);
      const data = await response.json();
      if (data.success) {
        // The backend should now return an array starting with "ALL"
        setAvailableYears(data.data);
      }
    } catch (error) {
      console.error("Error fetching years:", error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const url = `${import.meta.env.VITE_API_URL}/dashboard/data?year=${yearFilter}${monthFilter !== "ALL" ? `&month=${monthFilter}` : ''}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setDashboardData(data.data);
      } else {
        throw new Error(data.message || "Failed to fetch dashboard data");
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Months array for dropdown
  const months = [
    { value: "ALL", label: "All Monthss" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" }
  ];

  // Colors for charts
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe'];

  if (loading) {
    return (
      <Navbar>
        <div className="home-dashboard-container">
          <div className="home-loading">Loading dashboard...</div>
        </div>
      </Navbar>
    );
  }

  if (error) {
    return (
      <Navbar>
        <div className="home-dashboard-container">
          <div className="home-error">{error}</div>
        </div>
      </Navbar>
    );
  }

  if (!dashboardData) {
    return (
      <Navbar>
        <div className="home-dashboard-container">
          <div className="home-error">No dashboard data available</div>
        </div>
      </Navbar>
    );
  }

  const { summary, charts, insights } = dashboardData;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Handle card clicks for navigation
  const handleCardClick = (cardType) => {
    switch (cardType) {
      case 'maintenance':
        navigate('/maintenance');
        break;
      case 'expenses':
        navigate('/expense');
        break;
      case 'pending-maintenance':
        navigate('/members');
        break;
      case 'pending-expenses':
        navigate('/expense?status=PENDING');
        break;
      default:
        break;
    }
  };

  return (
    <Navbar>
      <div className="home-dashboard-container">
        {/* Header with Filters */}
        <div className="home-dashboard-header">
          <h1>
            <FiBarChart2 /> Financial Dashboard
          </h1>
          <p>High-level financial insights for Society Management</p>

          <div className="home-filters-panel">
            <div className="home-filter-group">
              <label>
                <FiFilter /> Year
              </label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="home-filter-select"
              >
                <option value="ALL">All Years</option> {/* Add this first */}
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="home-filter-group">
              <label>
                <FiCalendar /> Month
              </label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="home-filter-select"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="home-filter-info">
              Showing data for: <strong>
                {yearFilter === "ALL" ? "All Years" : yearFilter}
                {monthFilter !== "ALL" ? ` - ${months.find(m => m.value === monthFilter)?.label}` : ' (All Months)'}
              </strong>
            </div>
          </div>
        </div>

        {/* Summary Cards - 4 Cards */}
        <div className="home-metrics-grid">
          {/* Card 1: Total Maintenance Collected */}
          <div
            className="home-metric-card home-maintenance-metric home-clickable-card"
            onClick={() => handleCardClick('maintenance')}
          >
            <FiDollarSign className="home-metric-icon" />
            <div>
              <h3>Total Maintenance Collected</h3>
              <p>{formatCurrency(summary.totalCollectedAmount)}</p>
              <small>
                {/* Collected: {formatCurrency(summary.totalCollectedAmount)} •   */}
                {summary.totalFlats} flats
              </small>
            </div>
          </div>

          {/* Card 2: Total Expenses */}
          <div
            className="home-metric-card home-expenses-metric home-clickable-card"
            onClick={() => handleCardClick('expenses')}
          >
            <FiTrendingUp className="home-metric-icon" />
            <div>
              <h3>Total Expenses</h3>
              <p>{formatCurrency(summary.totalExpenses)}</p>
              <small>
                {monthFilter === "ALL" ? "Yearly" : "Monthly"} expenses
              </small>
            </div>
          </div>

          {/* Card 3: Pending Maintenance Collection */}
          <div
            className="home-metric-card home-pending-maintenance-metric home-clickable-card"
            onClick={() => handleCardClick('pending-maintenance')}
          >
            <FiClock className="home-metric-icon" />
            <div>
              <h3>Pending Maintenance</h3>
              <p>{formatCurrency(summary.pendingMaintenanceAmount)}</p>
              <small>
                {summary.totalFlats} flats • Click to view details
              </small>
            </div>
          </div>

          {/* Card 4: Pending Expense Bills */}
          <div
            className="home-metric-card home-pending-expenses-metric home-clickable-card"
            onClick={() => handleCardClick('pending-expenses')}
          >
            <FiAlertCircle className="home-metric-icon" />
            <div>
              <h3>Pending Expense Bills</h3>
              <p>{summary.pendingExpensesCount}</p>
              <small>
                {summary.pendingExpensesCount > 0 ? "Bills pending payment" : "All bills paid"}
              </small>
            </div>
          </div>
        </div>

        {/* Charts Section - 4 Charts */}
        <div className="home-charts-section">
          {/* Chart 1: Monthly Maintenance Collection */}
          <div className="home-chart-container">
            <div className="home-chart-header">
              <h3>Monthly Maintenance Collection</h3>
              <div className="home-chart-legend">
                <div className="home-legend-item">
                  <div className="home-legend-color home-maintenance-legend"></div>
                  <span>Maintenance</span>
                </div>
                <div className="home-legend-item">
                  <div className="home-legend-color home-water-legend"></div>
                  <span>Water</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts.monthlyMaintenance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="monthName"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    if (value >= 100000) return `₹${(value / 100000).toFixed(0)}L`;
                    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
                    return `₹${value}`;
                  }}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const formattedValue = new Intl.NumberFormat('en-IN').format(value);
                    return [`₹${formattedValue}`, name];
                  }}
                />
                <Legend />
                <Bar
                  dataKey="totalMaintenance"
                  name="Maintenance"
                  fill="#8884d8"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="totalWater"
                  name="Water"
                  fill="#82ca9d"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2: Monthly Expenses */}
          <div className="home-chart-container">
            <div className="home-chart-header">
              <h3>Monthly Expenses</h3>
              <div className="home-chart-legend">
                <div className="home-legend-item">
                  <div className="home-legend-color home-expenses-legend"></div>
                  <span>Expenses</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts.monthlyExpenses}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="monthName"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    if (value >= 100000) return `₹${(value / 100000).toFixed(0)}L`;
                    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
                    return `₹${value}`;
                  }}
                />
                <Tooltip
                  formatter={(value) => [`₹${new Intl.NumberFormat('en-IN').format(value)}`, "Expenses"]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalExpenses"
                  name="Expenses"
                  stroke="#ff6b6b"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 3: Yearly Maintenance vs Expenses */}
          <div className="home-chart-container">
            <div className="home-chart-header">
              <h3>Yearly Comparison</h3>
              <div className="home-chart-legend">
                <div className="home-legend-item">
                  <div className="home-legend-color home-maintenance-legend"></div>
                  <span>Maintenance</span>
                </div>
                <div className="home-legend-item">
                  <div className="home-legend-color home-expenses-legend"></div>
                  <span>Expenses</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts.yearlyComparison}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    if (value >= 100000) return `₹${(value / 100000).toFixed(0)}L`;
                    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
                    return `₹${value}`;
                  }}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const formattedValue = new Intl.NumberFormat('en-IN').format(value);
                    return [`₹${formattedValue}`, name];
                  }}
                />
                <Legend />
                <Bar
                  dataKey="totalMaintenance"
                  name="Maintenance"
                  fill="#4ecdc4"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="totalExpenses"
                  name="Expenses"
                  fill="#ff6b6b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 4: Pending Amount Overview */}
          <div className="home-chart-container">
            <div className="home-chart-header">
              <h3>Pending Amount Overview</h3>
              <div className="home-chart-legend">
                <FiPieChart className="home-pie-icon" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Maintenance ', value: charts.pendingOverview.maintenancePending },
                    { name: 'Expense ', value: charts.pendingOverview.expensePending }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Maintenance Pending', value: charts.pendingOverview.maintenancePending },
                    { name: 'Expense Pending', value: charts.pendingOverview.expensePending }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`₹${new Intl.NumberFormat('en-IN').format(value)}`, "Amount"]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="home-pending-stats">
              <div className="home-stat-item">
                <span className="home-stat-label">Maintenance Pending:</span>
                <span className="home-stat-value">
                  {formatCurrency(charts.pendingOverview.maintenancePending)}
                </span>
              </div>
              <div className="home-stat-item">
                <span className="home-stat-label">Expense Pending:</span>
                <span className="home-stat-value">
                  {formatCurrency(charts.pendingOverview.expensePending)}
                </span>
              </div>
              <div className="home-stat-item">
                <span className="home-stat-label">Flats with Pending:</span>
                <span className="home-stat-value">
                  {charts.pendingOverview.flatsWithPending} of {charts.pendingOverview.totalFlats}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="home-recent-activity">
          <h3>Recent Activity</h3>
          <div className="home-activity-grid">
            <div className="home-activity-section">
              <h4>Recent Maintenance Collections</h4>
              <div className="home-activity-list">
                {insights.recentMaintenance.length > 0 ? (
                  insights.recentMaintenance.map((item, index) => (
                    <div key={index} className="home-activity-item">
                      <div className="home-activity-info">
                        <span className="home-activity-title">Flat {item.flatNo}</span>
                        <span className="home-activity-amount">
                          {formatCurrency(item.collectionAmount)}
                        </span>
                      </div>
                      <div className="home-activity-meta">
                        <span className="home-activity-date">
                          {new Date(item.collectionDate).toLocaleDateString()}
                        </span>
                        <span className="home-activity-ref">#{item.maintenanceNo}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="home-no-activity">No recent maintenance collections</div>
                )}
              </div>
            </div>

            <div className="home-activity-section">
              <h4>Recent Expenses</h4>
              <div className="home-activity-list">
                {insights.recentExpenses.length > 0 ? (
                  insights.recentExpenses.map((item, index) => (
                    <div key={index} className="home-activity-item">
                      <div className="home-activity-info">
                        <span className="home-activity-title">{item.description}</span>
                        <span className="home-activity-amount">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                      <div className="home-activity-meta">
                        <span className="home-activity-category">{item.category}</span>
                        <span className={`home-activity-status home-${item.paymentStatus.toLowerCase()}`}>
                          {item.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="home-no-activity">No recent expenses</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Navbar>
  );
};

export default Home;