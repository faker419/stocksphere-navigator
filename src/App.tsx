import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Requests from "./pages/Requests";
import Inventory from "./pages/Inventory";
import Machinery from "./pages/Machinery";
import UsersPage from "./pages/admin/Users";
import RolesPage from "./pages/admin/Roles";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Route */}
            <Route path="/" element={<Login />} />

            {/* Protected Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              
              <Route
                path="/requests"
                element={
                  <ProtectedRoute requiredPrivilege="can_view_requests">
                    <Requests />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute requiredPrivilege="can_view_stock">
                    <Inventory />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/machinery"
                element={
                  <ProtectedRoute requiredPrivilege="can_view_machinery">
                    <Machinery />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredPrivilege="can_manage_users">
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/admin/roles"
                element={
                  <ProtectedRoute requiredPrivilege="can_manage_roles">
                    <RolesPage />
                  </ProtectedRoute>
                }
              />
              
              <Route path="/notifications" element={<Notifications />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
