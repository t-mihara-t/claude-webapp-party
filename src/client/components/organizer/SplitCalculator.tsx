import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  Event,
  Participant,
  SplitRule,
  SplitRatio,
  Role,
  Rounding,
} from "@/types";
import { ROLE_LABELS, ROUNDING_LABELS } from "@/types";

interface SplitCalculatorProps {
  eventId: string;
  event: Event;
  onEventUpdated?: (event: Event) => void;
}

interface CalculationResult {
  participants: Array<{
    id: string;
    name: string;
    role: Role;
    assigned_amount: number;
  }>;
  total: number;
  adjustment: number;
}

const ALL_ROLES: Role[] = ["boss", "senior", "member", "junior", "student", "free"];

export default function SplitCalculator({
  eventId,
  event,
  onEventUpdated,
}: SplitCalculatorProps) {
  const [totalAmount, setTotalAmount] = useState(
    event.total_amount?.toString() ?? ""
  );
  const [rounding, setRounding] = useState<Rounding>("ceil_100");
  const [ratios, setRatios] = useState<Record<Role, string>>({
    boss: "1.5",
    senior: "1.2",
    member: "1",
    junior: "0.8",
    student: "0.5",
    free: "0",
  });
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingRule, setLoadingRule] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingTotal, setSavingTotal] = useState(false);

  // Load existing split rule
  useEffect(() => {
    let cancelled = false;

    const loadSplitRule = async () => {
      try {
        const rule = await apiGet<SplitRule & { ratios: SplitRatio[] }>(
          `/events/${eventId}/split`
        );
        if (cancelled) return;
        setRounding(rule.rounding);
        if (rule.ratios && rule.ratios.length > 0) {
          const newRatios = { ...ratios };
          for (const r of rule.ratios) {
            newRatios[r.role] = r.ratio.toString();
          }
          setRatios(newRatios);
        }
      } catch {
        // No existing rule; use defaults
      } finally {
        if (!cancelled) setLoadingRule(false);
      }
    };

    loadSplitRule();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const handleSaveTotalAmount = async () => {
    if (!totalAmount) return;
    setSavingTotal(true);
    try {
      const updated = await apiPut<Event>(`/events/${eventId}`, {
        total_amount: Number(totalAmount),
      });
      onEventUpdated?.(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "合計金額の保存に失敗しました"
      );
    } finally {
      setSavingTotal(false);
    }
  };

  const handleRatioChange = (role: Role, value: string) => {
    if (role === "free") return; // free is always 0
    setRatios((prev) => ({ ...prev, [role]: value }));
  };

  const handleCalculate = async () => {
    if (!totalAmount || Number(totalAmount) <= 0) {
      setError("合計金額を入力してください");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Build ratios array
      const ratioData = ALL_ROLES.map((role) => ({
        role,
        ratio: Number(ratios[role]) || 0,
      }));

      const data = await apiPost<CalculationResult>(
        `/events/${eventId}/split/calculate`,
        {
          total_amount: Number(totalAmount),
          rounding,
          ratios: ratioData,
        }
      );
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "計算に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingRule) {
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

      {/* Total amount */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">合計金額</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="total_amount">合計金額 (円)</Label>
              <Input
                id="total_amount"
                type="number"
                min="0"
                step="100"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="例: 50000"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleSaveTotalAmount}
              disabled={savingTotal || !totalAmount}
            >
              {savingTotal ? "保存中..." : "保存"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rounding rule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">端数処理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="rounding">丸め単位</Label>
            <Select
              value={rounding}
              onValueChange={(val) => setRounding(val as Rounding)}
            >
              <SelectTrigger id="rounding">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(ROUNDING_LABELS) as [Rounding, string][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ratios per role */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">役職ごとの比率</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {ALL_ROLES.map((role) => (
              <div key={role} className="space-y-2">
                <Label htmlFor={`ratio-${role}`}>{ROLE_LABELS[role]}</Label>
                <Input
                  id={`ratio-${role}`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={ratios[role]}
                  onChange={(e) => handleRatioChange(role, e.target.value)}
                  disabled={role === "free"}
                  className={role === "free" ? "bg-muted" : ""}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            「一般」を1として、各役職の支払い比率を設定してください。無料招待は常に0です。
          </p>
        </CardContent>
      </Card>

      {/* Calculate button */}
      <Button
        onClick={handleCalculate}
        disabled={loading || !totalAmount}
        className="w-full"
        size="lg"
      >
        {loading ? "計算中..." : "計算実行"}
      </Button>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">計算結果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">名前</th>
                    <th className="text-left py-2 pr-4">役職</th>
                    <th className="text-right py-2">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {result.participants.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{p.name}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {ROLE_LABELS[p.role]}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {p.assigned_amount.toLocaleString()}円
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2">
                    <td colSpan={2} className="py-2 font-bold">
                      合計
                    </td>
                    <td className="py-2 text-right font-bold">
                      {result.total.toLocaleString()}円
                    </td>
                  </tr>
                  {result.adjustment !== 0 && (
                    <tr>
                      <td
                        colSpan={2}
                        className="py-1 text-muted-foreground text-xs"
                      >
                        調整額 (端数処理による差額)
                      </td>
                      <td className="py-1 text-right text-xs text-muted-foreground">
                        {result.adjustment > 0 ? "+" : ""}
                        {result.adjustment.toLocaleString()}円
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
