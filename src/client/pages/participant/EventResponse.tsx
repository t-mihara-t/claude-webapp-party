import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { apiGet } from "@/lib/api";
import { EventInfo } from "@/components/participant/EventInfo";
import { AttendanceForm } from "@/components/participant/AttendanceForm";
import { PaymentInfo } from "@/components/participant/PaymentInfo";
import type { Event, Participant } from "@/types";
import { Loader2, AlertCircle, Lock, CalendarX } from "lucide-react";

export default function EventResponse() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    apiGet<Event>(`/events/${id}/public`)
      .then((data) => {
        setEvent(data);
      })
      .catch((err) => {
        if (err && typeof err === "object" && "status" in err && err.status === 404) {
          setNotFound(true);
        } else {
          setNotFound(true);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  function handleParticipantSubmitted(p: Participant) {
    setParticipant(p);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">イベントが見つかりません</h2>
        <p className="text-muted-foreground text-center">
          URLが正しいかご確認ください。
        </p>
      </div>
    );
  }

  if (event.status === "draft") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">
          このイベントはまだ公開されていません
        </h2>
        <p className="text-muted-foreground text-center">
          幹事がイベントを公開するまでお待ちください。
        </p>
      </div>
    );
  }

  if (event.status === "closed" || event.status === "settled") {
    return (
      <div className="max-w-lg mx-auto space-y-6 px-4 py-6">
        <div className="flex flex-col items-center gap-4 py-8">
          <CalendarX className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-bold">
            このイベントは締め切られました
          </h2>
          <p className="text-muted-foreground text-center">
            出欠の受付は終了しています。
          </p>
        </div>
        <EventInfo event={event} />
        {participant && participant.assigned_amount != null && (
          <PaymentInfo participant={participant} event={event} />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 px-4 py-6">
      <EventInfo event={event} />
      <AttendanceForm
        eventId={event.id}
        onSubmitted={handleParticipantSubmitted}
        existingParticipant={participant}
      />
      {participant &&
        participant.attendance === "attending" &&
        participant.assigned_amount != null && (
          <PaymentInfo participant={participant} event={event} />
        )}
    </div>
  );
}
