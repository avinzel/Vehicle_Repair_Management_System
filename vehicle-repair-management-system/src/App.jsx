import './App.css'
import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router"
import { LoginPage } from "./pages/LoginPage/LoginPage";
import { ServiceAdvisorPage } from './pages/ServiceAdvisorPage/ServiceAdvisorPage';
import { NotFoundPage } from './pages/NotFoundPage/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage/RegisterPage';
import { MechanicPage } from "./pages/MechanicPage/MechanicPage"
import { Loading } from "./components/Loading"
import { AdminPage } from './pages/AdminPage/AdminPage';
import { DashBoardTab } from './pages/ServiceAdvisorPage/DashboardTab';
import Intake from './pages/ServiceAdvisorPage/Intake';
import { ActiveRepairOrder } from './pages/ServiceAdvisorPage/ActiveRepairOrder';
import { CustomerRecords } from './pages/ServiceAdvisorPage/CustomerRecords';
import { OrderHistory } from './pages/ServiceAdvisorPage/OrderHistory';
import { BillingInvoicing } from './pages/ServiceAdvisorPage/BillingInvoicing';
import { AssignedOrders } from './pages/MechanicPage/AssignedOrders';
import { DiagnosticLogs } from './pages/MechanicPage/DiagnosticLogs';
import { PartsLogger } from './pages/MechanicPage/PartsLogger';
import { AdminDashboardTab } from "./pages/AdminPage/AdminDashboardTab";
import { Staffs } from "./pages/AdminPage/Staffs";
import { MechanicsPage } from "./pages/AdminPage/Mechanics";
import { PartsInventory } from "./pages/AdminPage/PartsInventory";
import { Services } from "./pages/AdminPage/Services";
import { Reports } from "./pages/AdminPage/Reports";

import { OverviewTab } from "./pages/AdminPage/reports/OverviewTab";
import { PipelineTab } from "./pages/AdminPage/reports/PipelineTab";
import { MechanicsTab } from "./pages/AdminPage/reports/MechanicsTab";
import { PartsUsageTab } from "./pages/AdminPage/reports/PartsUsage";

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true);
  async function authenticateUser() {
    const response = await fetch("http://localhost:8000/api.php?action=check-auth", {
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      setUser(null);
    } else {
      setUser(data.user);
    }
    setLoading(false);
  }

  useEffect(() => {
    // login()
    // logout();
    authenticateUser();
  }, []);
  if (loading) {
    return (
      <Loading />
    )
  }
  return (
    <>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/" element={
          <LoginPage authenticateUser={authenticateUser} />
        } />

        <Route
          path="/admin"
          element={
            user && Number(user.role_id) === 1 ? (
              <AdminPage user={user} setUser={setUser} />
            ) : (
              <Navigate to="/" replace />
            )
          }

        >
          <Route index element={<AdminDashboardTab />} />
          <Route path='staff' element={<Staffs />} />
          <Route path='mechanics' element={<MechanicsPage />} />
          <Route path='parts' element={<PartsInventory />} />
          <Route path='services' element={<Services />} />

          <Route path="reports" element={<Reports />}>
            <Route index element={<OverviewTab />} />
            <Route path="pipeline" element={<PipelineTab />} />
            <Route path="parts-usage" element={<PartsUsageTab />} />
            <Route path="mechanics" element={<MechanicsTab />} />
          </Route>

        </Route>

        <Route
          path="/service-advisor"
          element={
            user && Number(user.role_id) === 2 ? (
              <ServiceAdvisorPage user={user} setUser={setUser} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        >
          <Route index element={<DashBoardTab />} />
          <Route path="intake" element={<Intake />} />
          <Route path="orders" element={<ActiveRepairOrder />} />

          {/* Add this dynamic route for specific orders */}
          <Route path="orders/:orderId" element={<ActiveRepairOrder />} />

          <Route path="customers" element={<CustomerRecords />} />
          <Route path="billing" element={<BillingInvoicing />} />
          <Route path="order-history" element={<OrderHistory />} />
        </Route>

        {/* Sub-routes now nested as children of /mechanic instead of
            declared as siblings at the top level — MechanicPage renders
            an <Outlet />, so its children have to actually be registered
            as children of this Route for the Outlet to have anything to
            match against. */}
        <Route
          path="/mechanic"
          element={
            user && Number(user.role_id) === 3 ? (
              <MechanicPage user={user} setUser={setUser} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        >
          <Route index element={<AssignedOrders />} />
          <Route path="diagnostic-log" element={<DiagnosticLogs />} />
          <Route path="part-logger" element={<PartsLogger />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App
