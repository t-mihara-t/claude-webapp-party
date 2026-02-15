import { useState, useEffect, type FormEvent } from "react";
import { apiGet, apiPut } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Event, Participant } from "@/types";
import { cn } from "@/lib/utils";

interface PayPaySettingsProps {
  eventId: string;
  event: Event;
  onEventUpdated?: (event: Event) => void;
}

export default function PayPaySettings({
  eventId,
  event,
  onEventUpdated,
}: PayPaySettingsProps) {
  const [paypayLink, setPaypayLink] = useState(event.paypay_link ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiGet<Participant[]>(`/events/${eventId}/participants`)
      .then((data) => {
        if (!cancelled) {
          setParticipants(data);
          setLoadingParticipants(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingParticipants(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updated = await apiPut<Event>(`/events/${eventId}`, {
        paypay_link: paypayLink.trim() || null,
      });
      onEventUpdated?.(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "保存に失敗しました"
      );
    } finally {
      setSaving(false);
    }
  };

  const buildPaymentUrl = (participant: Participant): string | null => {
    if (!paypayLink.trim() || !participant.assigned_amount) return null;
    const baseUrl = paypayLink.trim().replace(/\/+$/, "");
    return `${baseUrl}/${participant.assigned_amount}`;
  };

  const handleCopyLink = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  const attendingParticipants = participants.filter(
    (p) => p.attendance === "attending" && p.assigned_amount && p.assigned_amount > 0
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200">
          保存しました
        </div>
      )}

      {/* PayPay link setting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PayPayリンク設定</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paypay_link">PayPay送金リンク</Label>
              <Input
                id="paypay_link"
                type="url"
                value={paypayLink}
                onChange={(e) => setPaypayLink(e.target.value)}
                placeholder="例: https://paypay.me/username"
              />
              <p className="text-xs text-muted-foreground">
                PayPayアプリの「送金リンク」機能で生成したURLを入力してください。
              </p>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存する"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PayPay集金の流れ</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
            <li>
              上のフォームにPayPay送金リンクを設定します
            </li>
            <li>
              「割り勘」タブで各参加者の金額を計算します
            </li>
            <li>
              下の一覧から各参加者用の支払いリンクを共有します
            </li>
            <li>
              参加者はリンクをタップするだけでPayPayから支払えます
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Participant payment links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">参加者別の支払いリンク</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingParticipants ? (
            <p className="text-muted-foreground text-sm">読み込み中...</p>
          ) : !paypayLink.trim() ? (
            <p className="text-muted-foreground text-sm">
              PayPayリンクを設定すると、参加者ごとの支払いリンクが表示されます。
            </p>
          ) : attendingParticipants.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              金額が設定された出席者がいません。「割り勘」タブで計算を実行してください。
            </p>
          ) : (
            <div className="space-y-3">
              {attendingParticipants.map((participant) => {
                const paymentUrl = buildPaymentUrl(participant);
                return (
                  <div
                    key={participant.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{participant.name}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            participant.payment_status === "paid"
                              ? "bg-blue-100 text-blue-700 border-blue-300"
                              : "bg-orange-100 text-orange-700 border-orange-300"
                          )}
                        >
                          {participant.payment_status === "paid"
                            ? "支払済"
                            : "未払い"}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium mt-1">
                        {participant.assigned_amount?.toLocaleString()}円
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* QR code placeholder */}
                      <div className="w-20 h-20 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground border">
                        QR
                      </div>
                      <div className="flex flex-col gap-1">
                        {paymentUrl && (
                          <>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {paymentUrl}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyLink(paymentUrl)}
                            >
                              リンクをコピー
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
