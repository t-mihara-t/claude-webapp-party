import { Calendar, MapPin, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Event } from "@/types";

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = dayNames[date.getDay()];
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${year}年${month}月${day}日（${dayOfWeek}）${hours}:${minutes}〜`;
}

interface EventInfoProps {
  event: Event;
}

export function EventInfo({ event }: EventInfoProps) {
  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <h2 className="text-2xl font-bold leading-tight">{event.title}</h2>

        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-muted-foreground">日時</p>
            <p className="text-lg font-medium">
              {formatEventDate(event.event_date)}
            </p>
          </div>
        </div>

        {(event.venue_name || event.venue_address) && (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">会場</p>
              {event.venue_name && (
                <p className="text-lg font-medium">
                  {event.venue_url ? (
                    <a
                      href={event.venue_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
                    >
                      {event.venue_name}
                    </a>
                  ) : (
                    event.venue_name
                  )}
                </p>
              )}
              {event.venue_address && (
                <p className="text-muted-foreground text-sm mt-0.5">
                  {event.venue_address}
                </p>
              )}
            </div>
          </div>
        )}

        {event.budget_per_person != null && (
          <div className="flex items-start gap-3">
            <Wallet className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">予算</p>
              <p className="text-lg font-medium">
                約&yen;{event.budget_per_person.toLocaleString("ja-JP")} / 人
              </p>
            </div>
          </div>
        )}

        {event.description && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-1">詳細</p>
            <p className="text-base whitespace-pre-wrap leading-relaxed">
              {event.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
