import { Navigate, Outlet } from "react-router";
import { Loading } from "./components/Loading";
export function ProtectedRoute({ user, loading, allowedRole }) {
  if (loading) {
    return <Loading/>; 
  }

  if (!user || user["role_id"] !== allowedRole) {
    return <Navigate to="*" replace />;
  }

  return <Outlet />;
}