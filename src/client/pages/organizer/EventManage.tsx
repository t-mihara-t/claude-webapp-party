import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPut } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import EventForm from "@/components/organizer/EventForm";
import ParticipantManager from "@/components/organizer/ParticipantManager";
import RestaurantSearch from "@/components/organizer/RestaurantSearch";
import SplitCalculator from "@/components/organizer/SplitCalculator";
import PayPaySettings from "@/components/organizer/PayPaySettings";
import type { Event } from "@/types";
import { STATUS_LABELS } from "@/types";
import { cn } from "@/lib/utils";

function statusBadgeClass(status: string): string {
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

export default function EventManage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("info");
  const [editSuccess, setEditSuccess] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const fetchEvent = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiGet<{ event: Event }>(`/events/${id}`);
      setEvent(data.event);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "イベントの取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleEventUpdate = async (values: Partial<Event>) => {
    if (!id) return;
    const { event } = await apiPut<{ event: Event }>(`/events/${id}`, values);
    setEvent(event);
    setEditSuccess(true);
    setTimeout(() => setEditSuccess(false), 3000);
  };

  const handleVenueSelected = (venue: {
    venue_name: string;
    venue_address: string;
  }) => {
    if (event) {
      setEvent({ ...event, ...venue });
    }
    setActiveTab("info");
  };

  const handleEventUpdated = (updated: Event) => {
    setEvent(updated);
  };

  const participantLink =
    typeof window !== "undefined" && id
      ? `${window.location.origin}/event/${id}`
      : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(participantLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = participantLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/organizer")}
        >
          &larr; 戻る
        </Button>
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/organizer")}
        >
          &larr; 戻る
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold truncate">{event.title}</h1>
            <Badge
              variant="outline"
              className={cn("shrink-0", statusBadgeClass(event.status))}
            >
              {STATUS_LABELS[event.status]}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex overflow-x-auto">
          <TabsTrigger value="info" className="flex-1">
            基本情報
          </TabsTrigger>
          <TabsTrigger value="participants" className="flex-1">
            参加者
          </TabsTrigger>
          <TabsTrigger value="restaurant" className="flex-1">
            店舗検索
          </TabsTrigger>
          <TabsTrigger value="split" className="flex-1">
            割り勘
          </TabsTrigger>
          <TabsTrigger value="paypay" className="flex-1">
            PayPay
          </TabsTrigger>
        </TabsList>

        {/* Basic info tab */}
        <TabsContent value="info" className="space-y-6 mt-6">
          {editSuccess && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200">
              保存しました
            </div>
          )}

          {/* Participant link */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">参加者用リンク</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={participantLink}
                  readOnly
                  className="flex-1 bg-muted"
                />
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                >
                  {linkCopied ? "コピーしました" : "コピー"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                このリンクを参加者に共有してください。出欠回答ができます。
              </p>
            </CardContent>
          </Card>

          {/* Event edit form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">イベント情報を編集</CardTitle>
            </CardHeader>
            <CardContent>
              <EventForm
                initialValues={event}
                onSubmit={handleEventUpdate}
                submitLabel="更新する"
                showStatusField
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Participants tab */}
        <TabsContent value="participants" className="mt-6">
          <ParticipantManager eventId={event.id} />
        </TabsContent>

        {/* Restaurant search tab */}
        <TabsContent value="restaurant" className="mt-6">
          <RestaurantSearch
            eventId={event.id}
            onVenueSelected={handleVenueSelected}
          />
        </TabsContent>

        {/* Split calculator tab */}
        <TabsContent value="split" className="mt-6">
          <SplitCalculator
            eventId={event.id}
            event={event}
            onEventUpdated={handleEventUpdated}
          />
        </TabsContent>

        {/* PayPay settings tab */}
        <TabsContent value="paypay" className="mt-6">
          <PayPaySettings
            eventId={event.id}
            event={event}
            onEventUpdated={handleEventUpdated}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
