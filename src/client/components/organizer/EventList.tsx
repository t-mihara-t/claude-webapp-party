import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Event, EventStatus } from "@/types";
import { STATUS_LABELS } from "@/types";
import { cn } from "@/lib/utils";

interface EventListProps {
  events: Event[];
}

function formatDateJapanese(dateString: string): string {
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[date.getDay()];
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${year}年${month}月${day}日(${weekday}) ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
}

function statusVariant(status: EventStatus): string {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-700 border-gray-300";
    case "open":
      return "bg-green-100 text-green-700 border-green-300";
    case "closed":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "settled":
      return "bg-blue-100 text-blue-700 border-blue-300";
    default:
      return "";
  }
}

export default function EventList({ events }: EventListProps) {
  const navigate = useNavigate();

  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">
          まだ飲み会がありません
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          「新しい飲み会を作成」ボタンから始めましょう
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map((event) => (
        <Card
          key={event.id}
          className="cursor-pointer transition-shadow hover:shadow-md"
          onClick={() => navigate(`/organizer/events/${event.id}`)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg line-clamp-1">
                {event.title}
              </CardTitle>
              <Badge
                variant="outline"
                className={cn("shrink-0 text-xs", statusVariant(event.status))}
              >
                {STATUS_LABELS[event.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{formatDateJapanese(event.event_date)}</p>
              {event.venue_name && (
                <p className="line-clamp-1">{event.venue_name}</p>
              )}
              <div className="flex items-center justify-between pt-2 border-t">
                <span>
                  参加: {event.attending_count ?? 0} / {event.total_count ?? 0}人
                </span>
                {event.budget_per_person != null && (
                  <span>
                    予算: {event.budget_per_person.toLocaleString()}円/人
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
