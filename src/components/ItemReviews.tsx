import { useEffect, useState } from "react";
import { getItemReviews, type ItemReview } from "../community";

export function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

/** Reseñas de todos los usuarios para un ítem. No muestra nada si no hay ninguna. */
export function ItemReviews({ itemId }: { itemId: string }) {
  const [reviews, setReviews] = useState<ItemReview[]>([]);

  useEffect(() => {
    let cancelled = false;
    setReviews([]);
    getItemReviews(itemId).then((r) => {
      if (!cancelled) setReviews(r);
    });
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  if (reviews.length === 0) return null;

  return (
    <div className="infocard-reviews">
      <p className="infocard-people-label">Reseñas ({reviews.length})</p>
      <ul>
        {reviews.map((r) => (
          <li key={r.userId} className="review-item">
            <div className="review-head">
              {r.avatarUrl ? (
                <img src={r.avatarUrl} alt="" className="avatar-tiny" />
              ) : (
                <span className="avatar-tiny avatar-placeholder" aria-hidden="true">
                  👤
                </span>
              )}
              <span className="review-author">{r.displayName ?? `@${r.username}`}</span>
              {r.displayName && <span className="review-meta">@{r.username}</span>}
              {r.reviewedAt && <span className="review-meta">· {formatReviewDate(r.reviewedAt)}</span>}
            </div>
            <p className="review-text">{r.review}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
