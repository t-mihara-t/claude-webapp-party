import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";
import Login from "@/pages/organizer/Login";
import Dashboard from "@/pages/organizer/Dashboard";
import EventCreate from "@/pages/organizer/EventCreate";
import EventManage from "@/pages/organizer/EventManage";
import EventResponse from "@/pages/participant/EventResponse";

function LandingPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/organizer" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="text-6xl">🍻</div>
      <h1 className="text-4xl font-bold tracking-tight">飲み会幹事くん</h1>
      <p className="text-xl text-muted-foreground text-center max-w-md">
        飲み会の幹事業務を簡単にサポート。店舗検索・出欠管理・割り勘計算・PayPay連携まで。
      </p>
      <a
        href="/organizer/login"
        className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
      >
        幹事としてログイン
      </a>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/organizer/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-6">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/organizer/login" element={<Login />} />
          <Route
            path="/organizer"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/events/new"
            element={
              <ProtectedRoute>
                <EventCreate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/events/:id"
            element={
              <ProtectedRoute>
                <EventManage />
              </ProtectedRoute>
            }
          />
          <Route path="/event/:id" element={<EventResponse />} />
        </Routes>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
