import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function Header() {
  const location = useLocation();
  const { user, login, logout } = useAuth();
  const isOrganizerPage = location.pathname.startsWith("/organizer");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-xl" role="img" aria-label="beer">
            🍻
          </span>
          <span className="font-bold text-lg">飲み会幹事くん</span>
        </Link>

        <nav className="flex items-center gap-4">
          {isOrganizerPage && user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {user.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <span className="text-sm font-medium hidden sm:inline-block">
                  {user.name}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline-block">ログアウト</span>
              </Button>
            </div>
          ) : !isOrganizerPage ? (
            <Button variant="outline" size="sm" onClick={login}>
              幹事ログイン
            </Button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
