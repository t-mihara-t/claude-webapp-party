import { Routes, Route } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/organizer/Dashboard";
import EventCreate from "@/pages/organizer/EventCreate";
import EventManage from "@/pages/organizer/EventManage";
import EventResponse from "@/pages/participant/EventResponse";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/organizer" element={<Dashboard />} />
          <Route path="/organizer/events/new" element={<EventCreate />} />
          <Route path="/organizer/events/:id" element={<EventManage />} />
          <Route path="/event/:id" element={<EventResponse />} />
        </Routes>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
