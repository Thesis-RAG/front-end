import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import LoginPage from "@/pages/LoginPage";
import ForbiddenPage from "@/pages/ForbiddenPage";
import ChatPage from "@/pages/ChatPage";
import GmailPage from "@/pages/GmailPage";
import SearchPage from "@/pages/SearchPage";
import DocumentsPage from "@/pages/DocumentsPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import UsersPage from "@/pages/UsersPage";
import AuditPage from "@/pages/AuditPage";
import SettingsPage from "@/pages/SettingsPage";
import PolicyPage from "@/pages/PolicyPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forbidden" element={<ForbiddenPage />} />

            {/* Protected routes */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/login" replace />} />

              <Route
                path="/chat"
                element={
                  <ProtectedRoute permission="chat">
                    <ChatPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/search"
                element={
                  <ProtectedRoute permission="search">
                    <SearchPage />
                  </ProtectedRoute>
                }
              />

              <Route path="/gmail" element={<GmailPage />} />
              <Route path="/gmail/callback" element={<GmailPage />} />

              <Route
                path="/documents"
                element={
                  <ProtectedRoute permission="documents.view">
                    <DocumentsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/approvals"
                element={
                  <ProtectedRoute permission="approvals">
                    <ApprovalsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/users"
                element={
                  <ProtectedRoute permission="users.manage">
                    <UsersPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/audit"
                element={
                  <ProtectedRoute permission="audit.view">
                    <AuditPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute permission="settings">
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/policy"
                element={
                  <ProtectedRoute permission="policy.manage">
                    <PolicyPage />
                  </ProtectedRoute>
                }
              />
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
