import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Event, EventStatus } from "@/types";
import { STATUS_LABELS } from "@/types";

interface EventFormValues {
  title: string;
  description: string;
  event_date: string;
  venue_name: string;
  venue_address: string;
  budget_per_person: string;
  total_amount: string;
  status: EventStatus;
  paypay_link: string;
}

interface EventFormProps {
  initialValues?: Partial<Event>;
  onSubmit: (values: Partial<Event>) => Promise<void>;
  submitLabel?: string;
  showStatusField?: boolean;
}

function toLocalDatetimeString(isoString?: string): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

export default function EventForm({
  initialValues,
  onSubmit,
  submitLabel = "保存",
  showStatusField = false,
}: EventFormProps) {
  const [values, setValues] = useState<EventFormValues>({
    title: initialValues?.title ?? "",
    description: initialValues?.description ?? "",
    event_date: toLocalDatetimeString(initialValues?.event_date),
    venue_name: initialValues?.venue_name ?? "",
    venue_address: initialValues?.venue_address ?? "",
    budget_per_person: initialValues?.budget_per_person?.toString() ?? "",
    total_amount: initialValues?.total_amount?.toString() ?? "",
    status: initialValues?.status ?? "draft",
    paypay_link: initialValues?.paypay_link ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof EventFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!values.title.trim()) {
      setError("タイトルは必須です");
      return;
    }
    if (!values.event_date) {
      setError("日時は必須です");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<Event> = {
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        event_date: new Date(values.event_date).toISOString(),
        venue_name: values.venue_name.trim() || undefined,
        venue_address: values.venue_address.trim() || undefined,
        budget_per_person: values.budget_per_person
          ? Number(values.budget_per_person)
          : undefined,
        total_amount: values.total_amount
          ? Number(values.total_amount)
          : undefined,
        paypay_link: values.paypay_link.trim() || undefined,
      };
      if (showStatusField) {
        payload.status = values.status;
      }
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">タイトル *</Label>
        <Input
          id="title"
          value={values.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="例: 新年会2026"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={values.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="飲み会の詳細を入力..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="event_date">日時 *</Label>
        <Input
          id="event_date"
          type="datetime-local"
          value={values.event_date}
          onChange={(e) => handleChange("event_date", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="venue_name">店名</Label>
          <Input
            id="venue_name"
            value={values.venue_name}
            onChange={(e) => handleChange("venue_name", e.target.value)}
            placeholder="例: 居酒屋 〇〇"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue_address">住所</Label>
          <Input
            id="venue_address"
            value={values.venue_address}
            onChange={(e) => handleChange("venue_address", e.target.value)}
            placeholder="例: 東京都渋谷区..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="budget_per_person">予算/人 (円)</Label>
          <Input
            id="budget_per_person"
            type="number"
            min="0"
            step="100"
            value={values.budget_per_person}
            onChange={(e) => handleChange("budget_per_person", e.target.value)}
            placeholder="例: 4000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="total_amount">合計金額 (円)</Label>
          <Input
            id="total_amount"
            type="number"
            min="0"
            step="100"
            value={values.total_amount}
            onChange={(e) => handleChange("total_amount", e.target.value)}
            placeholder="例: 50000"
          />
        </div>
      </div>

      {showStatusField && (
        <div className="space-y-2">
          <Label htmlFor="status">ステータス</Label>
          <Select
            value={values.status}
            onValueChange={(val) => handleChange("status", val)}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(STATUS_LABELS) as [EventStatus, string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="paypay_link">PayPayリンク</Label>
        <Input
          id="paypay_link"
          type="url"
          value={values.paypay_link}
          onChange={(e) => handleChange("paypay_link", e.target.value)}
          placeholder="例: https://paypay.me/username"
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "保存中..." : submitLabel}
      </Button>
    </form>
  );
}
