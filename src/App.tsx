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
import ItemsPage from "./pages/Items";
import ItemLabelsPage from "./pages/ItemLabelsPage";
import ItemCategoriesPage from "./pages/ItemCategories";
import CategoryImportPage from "./pages/CategoryImport";
import Machinery from "./pages/Machinery";
import MachineryImport from "./pages/MachineryImport";
import UsersPage from "./pages/admin/Users";
import RolesPage from "./pages/admin/Roles";
import Notifications from "./pages/Notifications";
import ActivityLogsPage from "./pages/ActivityLogs";
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
                path="/items"
                element={
                  <ProtectedRoute requiredPrivilege="can_view_items">
                    <ItemsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/items/categories"
                element={
                  <ProtectedRoute requiredPrivilege="can_manage_items">
                    <ItemCategoriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/items/labels"
                element={
                  <ProtectedRoute requiredPrivilege="can_manage_items">
                    <ItemLabelsPage />
                  </ProtectedRoute>
                }
              />
        <Route
          path="/items/categories/import"
          element={
            <ProtectedRoute requiredPrivilege="can_manage_items">
              <CategoryImportPage />
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
                path="/machinery/import"
                element={
                  <ProtectedRoute requiredPrivilege="can_manage_machinery">
                    <MachineryImport />
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
              
              <Route
                path="/admin/activity-logs"
                element={
                  <ProtectedRoute requiredPrivilege="can_view_activity_logs">
                    <ActivityLogsPage />
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
