export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex h-14 items-center justify-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} 飲み会幹事くん</p>
      </div>
    </footer>
  );
}
