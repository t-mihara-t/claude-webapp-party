import { useState, type FormEvent } from "react";
import { apiGet, apiPut } from "@/lib/api";
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
import type { Restaurant, Event } from "@/types";

interface RestaurantSearchProps {
  eventId: string;
  onVenueSelected?: (venue: { venue_name: string; venue_address: string }) => void;
}

const BUDGET_OPTIONS = [
  { value: "B001", label: "1,501~2,000円" },
  { value: "B002", label: "2,001~3,000円" },
  { value: "B003", label: "3,001~4,000円" },
  { value: "B004", label: "4,001~5,000円" },
  { value: "B005", label: "5,001~7,000円" },
  { value: "B006", label: "7,001~10,000円" },
  { value: "B008", label: "10,001~15,000円" },
];

export default function RestaurantSearch({
  eventId,
  onVenueSelected,
}: RestaurantSearchProps) {
  const [keyword, setKeyword] = useState("");
  const [budget, setBudget] = useState("");
  const [results, setResults] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const params = new URLSearchParams({ keyword: keyword.trim() });
      if (budget && budget !== "none") {
        params.set("budget", budget);
      }
      const data = await apiGet<{ shops: Restaurant[] }>(
        `/restaurants/search?${params.toString()}`
      );
      setResults(data.shops);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "検索に失敗しました"
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVenue = async (restaurant: Restaurant) => {
    setSelecting(restaurant.id);
    try {
      await apiPut<Event>(`/events/${eventId}`, {
        venue_name: restaurant.name,
        venue_address: restaurant.address,
        venue_url: restaurant.url,
      });
      onVenueSelected?.({
        venue_name: restaurant.name,
        venue_address: restaurant.address,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "店舗の設定に失敗しました"
      );
    } finally {
      setSelecting(null);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="keyword">キーワード</Label>
            <Input
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="例: 宝塚駅 居酒屋"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">予算上限</Label>
            <Select value={budget} onValueChange={setBudget}>
              <SelectTrigger id="budget">
                <SelectValue placeholder="指定なし" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">指定なし</SelectItem>
                {BUDGET_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit" disabled={loading || !keyword.trim()}>
          {loading ? "検索中..." : "検索する"}
        </Button>
      </form>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {searched && !loading && results.length === 0 && !error && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            該当する店舗が見つかりませんでした
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((restaurant) => (
            <Card key={restaurant.id}>
              {restaurant.photo && (
                <div className="aspect-video overflow-hidden rounded-t-lg">
                  <img
                    src={restaurant.photo}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {restaurant.url ? (
                    <a
                      href={restaurant.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-primary"
                    >
                      {restaurant.name}
                    </a>
                  ) : (
                    restaurant.name
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">{restaurant.address}</p>
                {restaurant.access && (
                  <p className="text-muted-foreground">
                    アクセス: {restaurant.access}
                  </p>
                )}
                {restaurant.budget && (
                  <p className="font-medium">予算: {restaurant.budget}</p>
                )}
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => handleSelectVenue(restaurant)}
                  disabled={selecting === restaurant.id}
                >
                  {selecting === restaurant.id
                    ? "設定中..."
                    : "この店に決定"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
