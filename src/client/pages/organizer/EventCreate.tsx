import { useNavigate } from "react-router-dom";
import { apiPost } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EventForm from "@/components/organizer/EventForm";
import type { Event } from "@/types";

export default function EventCreate() {
  const navigate = useNavigate();

  const handleSubmit = async (values: Partial<Event>) => {
    const { event } = await apiPost<{ event: Event }>("/events", values);
    navigate(`/organizer/events/${event.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/organizer")}
        >
          &larr; 戻る
        </Button>
        <h1 className="text-xl font-bold">新しい飲み会を作成</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>飲み会情報</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm onSubmit={handleSubmit} submitLabel="作成する" />
        </CardContent>
      </Card>
    </div>
  );
}
