import { useState, useEffect, type FormEvent } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Participant, Role, Gender, Attendance, PaymentStatus } from "@/types";
import {
  ROLE_LABELS,
  GENDER_LABELS,
  ATTENDANCE_LABELS,
} from "@/types";
import { cn } from "@/lib/utils";

interface ParticipantManagerProps {
  eventId: string;
}

function attendanceBadgeClass(attendance: Attendance): string {
  switch (attendance) {
    case "attending":
      return "bg-green-100 text-green-700 border-green-300";
    case "declined":
      return "bg-red-100 text-red-700 border-red-300";
    case "pending":
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

function paymentBadgeClass(status: PaymentStatus): string {
  switch (status) {
    case "paid":
      return "bg-blue-100 text-blue-700 border-blue-300";
    case "unpaid":
    default:
      return "bg-orange-100 text-orange-700 border-orange-300";
  }
}

export default function ParticipantManager({ eventId }: ParticipantManagerProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Role>("member");
  const [newGender, setNewGender] = useState<Gender | "">("");
  const [adding, setAdding] = useState(false);

  const fetchParticipants = async () => {
    try {
      const data = await apiGet<Participant[]>(
        `/events/${eventId}/participants`
      );
      setParticipants(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "参加者の取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [eventId]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setAdding(true);
    try {
      const body: Record<string, unknown> = {
        name: newName.trim(),
        role: newRole,
      };
      if (newGender) {
        body.gender = newGender;
      }
      const created = await apiPost<Participant>(
        `/events/${eventId}/participants`,
        body
      );
      setParticipants((prev) => [...prev, created]);
      setNewName("");
      setNewRole("member");
      setNewGender("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "参加者の追加に失敗しました"
      );
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateField = async (
    participantId: string,
    field: string,
    value: string
  ) => {
    try {
      const updated = await apiPut<Participant>(
        `/events/${eventId}/participants/${participantId}`,
        { [field]: value }
      );
      setParticipants((prev) =>
        prev.map((p) => (p.id === participantId ? updated : p))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "更新に失敗しました"
      );
    }
  };

  const handleTogglePayment = async (participant: Participant) => {
    const newStatus: PaymentStatus =
      participant.payment_status === "paid" ? "unpaid" : "paid";
    await handleUpdateField(participant.id, "payment_status", newStatus);
  };

  const handleDelete = async (participantId: string) => {
    if (!window.confirm("この参加者を削除しますか？")) return;
    try {
      await apiDelete(`/events/${eventId}/participants/${participantId}`);
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "削除に失敗しました"
      );
    }
  };

  const handleBulkMarkPaid = async () => {
    try {
      await apiPost(`/events/${eventId}/participants/bulk-paid`);
      setParticipants((prev) =>
        prev.map((p) => ({ ...p, payment_status: "paid" as PaymentStatus }))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "一括更新に失敗しました"
      );
    }
  };

  const attendingCount = participants.filter(
    (p) => p.attendance === "attending"
  ).length;
  const paidCount = participants.filter(
    (p) => p.payment_status === "paid"
  ).length;

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{participants.length}</p>
            <p className="text-sm text-muted-foreground">全参加者</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {attendingCount}
            </p>
            <p className="text-sm text-muted-foreground">出席</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{paidCount}</p>
            <p className="text-sm text-muted-foreground">支払済</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {participants.length - paidCount}
            </p>
            <p className="text-sm text-muted-foreground">未払い</p>
          </CardContent>
        </Card>
      </div>

      {/* Add participant form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">参加者を追加</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="名前"
                required
              />
            </div>
            <div className="w-full sm:w-32">
              <Select
                value={newRole}
                onValueChange={(val) => setNewRole(val as Role)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ROLE_LABELS) as [Role, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-28">
              <Select
                value={newGender || "none"}
                onValueChange={(val) =>
                  setNewGender(val === "none" ? "" : (val as Gender))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="性別" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未設定</SelectItem>
                  {(Object.entries(GENDER_LABELS) as [Gender, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={adding || !newName.trim()}>
              {adding ? "追加中..." : "追加"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Bulk operations */}
      {participants.length > 0 && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleBulkMarkPaid}>
            全員を支払済にする
          </Button>
        </div>
      )}

      {/* Participant list */}
      {participants.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            参加者がまだいません。上のフォームから追加してください。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {participants.map((participant) => (
            <Card key={participant.id}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Name and badges */}
                  <div className="flex-1 flex flex-wrap items-center gap-2">
                    <span className="font-medium">{participant.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        attendanceBadgeClass(participant.attendance)
                      )}
                    >
                      {ATTENDANCE_LABELS[participant.attendance]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs cursor-pointer",
                        paymentBadgeClass(participant.payment_status)
                      )}
                      onClick={() => handleTogglePayment(participant)}
                    >
                      {participant.payment_status === "paid"
                        ? "支払済"
                        : "未払い"}
                    </Badge>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={participant.role}
                      onValueChange={(val) =>
                        handleUpdateField(participant.id, "role", val)
                      }
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.entries(ROLE_LABELS) as [Role, string][]
                        ).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={participant.gender || "none"}
                      onValueChange={(val) =>
                        handleUpdateField(
                          participant.id,
                          "gender",
                          val === "none" ? "" : val
                        )
                      }
                    >
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue placeholder="性別" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">未設定</SelectItem>
                        {(
                          Object.entries(GENDER_LABELS) as [Gender, string][]
                        ).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {participant.assigned_amount != null && (
                      <span className="text-sm font-medium min-w-[5rem] text-right">
                        {participant.assigned_amount.toLocaleString()}円
                      </span>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(participant.id)}
                    >
                      削除
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
