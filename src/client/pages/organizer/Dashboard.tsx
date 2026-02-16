import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EventList from "@/components/organizer/EventList";
import type { Event, EventStatus } from "@/types";

type FilterTab = "all" | EventStatus;

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "draft", label: "下書き" },
  { value: "open", label: "募集中" },
  { value: "closed", label: "締切" },
  { value: "settled", label: "精算済" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiGet<{ events: Event[] }>("/events")
      .then((data) => {
        if (!cancelled) {
          setEvents(data.events);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "イベントの取得に失敗しました");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEvents = useMemo(() => {
    if (activeTab === "all") return events;
    return events.filter((e) => e.status === activeTab);
  }, [events, activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">飲み会一覧</h2>
        <Button onClick={() => navigate("/organizer/events/new")}>
          新しい飲み会を作成
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as FilterTab)}
      >
        <TabsList className="w-full sm:w-auto">
          {FILTER_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && <EventList events={filteredEvents} />}
    </div>
  );
}
