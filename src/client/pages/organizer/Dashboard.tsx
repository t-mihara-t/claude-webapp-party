import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/organizer/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    apiGet<Event[]>("/events")
      .then((data) => {
        if (!cancelled) {
          setEvents(data);
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
  }, [user]);

  const filteredEvents = useMemo(() => {
    if (activeTab === "all") return events;
    return events.filter((e) => e.status === activeTab);
  }, [events, activeTab]);

  if (authLoading || (!user && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">飲み会幹事くん</h1>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.name}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={logout}>
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
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
      </main>
    </div>
  );
}
