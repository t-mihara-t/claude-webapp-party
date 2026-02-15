import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiPost } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EventForm from "@/components/organizer/EventForm";
import type { Event } from "@/types";

export default function EventCreate() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/organizer/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (values: Partial<Event>) => {
    const created = await apiPost<Event>("/events", values);
    navigate(`/organizer/events/${created.id}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/organizer/dashboard")}
          >
            &larr; 戻る
          </Button>
          <h1 className="text-xl font-bold">新しい飲み会を作成</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>飲み会情報</CardTitle>
          </CardHeader>
          <CardContent>
            <EventForm onSubmit={handleSubmit} submitLabel="作成する" />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
