import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Siden finnes ikke</h1>
      <Link to="/" className="text-brand underline">
        Tilbake til restaurantlisten
      </Link>
    </div>
  );
}
