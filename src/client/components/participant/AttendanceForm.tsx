import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { apiPost } from "@/lib/api";
import { ATTENDANCE_LABELS } from "@/types";
import type { Participant, Attendance } from "@/types";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface AttendanceFormProps {
  eventId: string;
  onSubmitted: (participant: Participant) => void;
  existingParticipant?: Participant | null;
}

export function AttendanceForm({
  eventId,
  onSubmitted,
  existingParticipant,
}: AttendanceFormProps) {
  const [name, setName] = useState(existingParticipant?.name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!existingParticipant);
  const [lastAttendance, setLastAttendance] = useState<Attendance | null>(
    existingParticipant?.attendance ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(attendance: Attendance) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("お名前を入力してください");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const data = await apiPost<{ participant: Participant }>(
        `/events/${eventId}/respond`,
        { name: trimmedName, attendance },
      );
      setLastAttendance(attendance);
      setSubmitted(true);
      onSubmitted(data.participant);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "送信に失敗しました。もう一度お試しください。",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted && lastAttendance) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            {lastAttendance === "attending" ? (
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            ) : (
              <XCircle className="h-12 w-12 text-red-400 mx-auto" />
            )}
            <div>
              <p className="text-lg font-semibold">{name} さん</p>
              <p className="text-xl font-bold mt-1">
                {lastAttendance === "attending" ? (
                  <span className="text-green-600">出席で回答済み</span>
                ) : (
                  <span className="text-red-500">欠席で回答済み</span>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSubmitted(false);
              }}
            >
              回答を変更する
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <h3 className="text-xl font-bold text-center">出欠を回答する</h3>

        <div className="space-y-2">
          <Label htmlFor="participant-name" className="text-base">
            お名前
          </Label>
          <Input
            id="participant-name"
            type="text"
            placeholder="山田 太郎"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            className="h-12 text-base"
            disabled={submitting}
          />
        </div>

        {error && (
          <p className="text-destructive text-sm text-center">{error}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-14 text-lg font-bold bg-green-600 hover:bg-green-700 text-white"
            onClick={() => handleSubmit("attending")}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "出席する"
            )}
          </Button>
          <Button
            variant="destructive"
            className="h-14 text-lg font-bold"
            onClick={() => handleSubmit("declined")}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "欠席する"
            )}
          </Button>
        </div>

        {existingParticipant && (
          <p className="text-sm text-muted-foreground text-center">
            現在の回答: {ATTENDANCE_LABELS[existingParticipant.attendance]}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
