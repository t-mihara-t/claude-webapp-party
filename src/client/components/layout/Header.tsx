import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-xl" role="img" aria-label="beer">
            🍻
          </span>
          <span className="font-bold text-lg">飲み会幹事くん</span>
        </Link>
      </div>
    </header>
  );
}
