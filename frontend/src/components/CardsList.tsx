import { useEffect, useState } from "react";
import { apiGet } from "../api";

type Card = {
  cardId: string;
  name: string;
  price?: number;
};

export function CardsList() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const res = await apiGet<{ cards: Card[] }>("/cards?limit=100");
      setCards(res.cards);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div>Loading cards…</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="cards-grid">
      {cards.map((c: any) => (
        <div key={c.cardId} className="card">
          <b>{c.name}</b>
          <div>ID: {c.cardId}</div>
          <div>Price: {c.price ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}
