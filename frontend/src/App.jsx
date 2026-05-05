import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import Mood from "@/pages/Mood";
import Journal from "@/pages/Journal";
import Habits from "@/pages/Habits";
import Breathing from "@/pages/Breathing";
import Sleep from "@/pages/Sleep";
import Therapist from "@/pages/Therapist";
import AppShell from "@/components/AppShell";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading || user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-600">
        <div className="animate-pulse">Settling in...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen" />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/chat/:sessionId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/mood" element={<ProtectedRoute><Mood /></ProtectedRoute>} />
            <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
            <Route path="/habits" element={<ProtectedRoute><Habits /></ProtectedRoute>} />
            <Route path="/breathing" element={<ProtectedRoute><Breathing /></ProtectedRoute>} />
            <Route path="/sleep" element={<ProtectedRoute><Sleep /></ProtectedRoute>} />
            <Route path="/therapist" element={<ProtectedRoute><Therapist /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </div>
    </AuthProvider>
  );
}
