---
title: Designing Idempotent Endpoints: Safe Retries for Payments, Webhooks and XP Awards
author: sari_dewi
category: web-backend
difficulty: advanced
status: published
age: 12
featured: true
cover: unsplash:1451187580459-43490279c0fa
---

Networks fail in the most annoying way possible: **ambiguously**. A client sends `POST /payments`, the connection drops, and now nobody knows whether the server processed the request. The client retries. If your endpoint is not idempotent, the customer is charged twice.

Idempotency is the property that makes retries safe. This scroll explains what it really means, which HTTP methods give it to you for free, and three concrete patterns to add it to endpoints that do not: idempotency keys, natural unique constraints, and conditional updates. The examples are Go and Postgres, and the running example is how KnoFo awards XP, where double-awarding is a real bug class.

![Earth at night with network lines of light](unsplash:1451187580459-43490279c0fa)
*Every distributed system eventually delivers the same message twice. Design for it.*

## What idempotent means (and what it does not)

An operation is **idempotent** if performing it N times has the same effect on server state as performing it once. Note the wording: *effect on state*, not "returns the same response". A second `DELETE /scrolls/7` may return `404` instead of `204`, and the operation is still idempotent, because the scroll is gone either way.

| Method | Idempotent? | Safe? | Notes |
|---|---|---|---|
| GET, HEAD, OPTIONS | Yes | Yes | Must not change state |
| PUT | Yes | No | Replaces the whole resource |
| DELETE | Yes | No | Repeat deletes are no-ops |
| POST | **No** | No | Creates something new each time |
| PATCH | Depends | No | `set x=5` yes, `increment x` no |

So the problem children are `POST` and non-trivial `PATCH`: exactly the endpoints that move money, send emails, and award points.

> A famous footgun: `GET /scrolls/:id` that records a "view" is not safe. Retries, prefetching, and link scanners will trigger it. If a read has a side effect, make the side effect idempotent per user.

## Why retries happen

You will see duplicates from several directions at once:

- The client times out and retries (mobile networks, flaky Wi-Fi).
- A load balancer or proxy retries a request that failed upstream.
- A user double-clicks the submit button.
- A message queue delivers **at-least-once**; consumers must tolerate duplicates.
- A webhook sender (payment provider, Git host) retries until you return 2xx.

Exactly-once delivery is not available over a network. What you can build is **at-least-once delivery + idempotent handlers = effectively once**.

![Pengembang bekerja di lingkungan gelap dengan banyak layar](unsplash:1510915228340-29c85a43dcfe)
*Pengembang bekerja di lingkungan gelap dengan banyak layar.*

## Pattern 1: Idempotency keys

The client generates a unique key per *logical* operation and sends it in a header. The server stores the key with the result; a repeat returns the stored result instead of redoing the work.

```http
POST /payments
Idempotency-Key: 6b0f2c7e-9c1a-4d2a-9f0b-1f2f6c1e8a11
Content-Type: application/json

{"order_id": 991, "amount": 150000}
```

Table:

```sql
CREATE TABLE idempotency_keys (
  key           text        NOT NULL,
  user_id       bigint      NOT NULL,
  request_hash  text        NOT NULL,
  status_code   int,
  response_body jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
```

Handler flow:

```go
func CreatePayment(c *gin.Context) {
	key := c.GetHeader("Idempotency-Key")
	if key == "" {
		c.JSON(400, gin.H{"message": "Idempotency-Key required"})
		return
	}
	body, _ := io.ReadAll(c.Request.Body)
	hash := sha256hex(body)

	// 1. Try to claim the key. Only one concurrent request wins the INSERT.
	res := db.Exec(`INSERT INTO idempotency_keys (key, user_id, request_hash)
	                VALUES (?, ?, ?) ON CONFLICT DO NOTHING`, key, uid, hash)

	if res.RowsAffected == 0 {
		var row IdemRow
		db.Where("user_id = ? AND key = ?", uid, key).First(&row)
		if row.RequestHash != hash {
			c.JSON(422, gin.H{"message": "key reused with a different request"})
			return
		}
		if row.StatusCode == nil {
			c.JSON(409, gin.H{"message": "request in progress"})
			return
		}
		c.Data(*row.StatusCode, "application/json", row.ResponseBody)
		return
	}

	// 2. We own the key: do the work once, then store the response.
	resp, status := doPayment(body)
	db.Exec(`UPDATE idempotency_keys SET status_code=?, response_body=?
	         WHERE user_id=? AND key=?`, status, resp, uid, key)
	c.Data(status, "application/json", resp)
}
```

Details that matter:

- **Scope the key per user** so one tenant cannot replay another's key.
- **Compare a request hash.** Same key with a different body is a client bug; return `422`, not the old result.
- **Handle "in progress"** (second request arrives while the first is still running) with `409` or by waiting.
- **Expire old keys** (24 hours is typical, Stripe uses 24 h).
- For correctness, the side effect and the stored result should commit **in the same database transaction** whenever the side effect is a database write. If the side effect is external (a call to a payment provider), pass your key onward as *their* idempotency key.

## Pattern 2: Natural unique constraints

Often you do not need a key table. The operation has a natural identity, and the database can enforce "only once".

KnoFo awards XP for events like "scroll published" or "like received". The `xp_logs` table has a unique index on `(user_id, reason, source_id)`:

```sql
CREATE UNIQUE INDEX idx_xplog_user_reason_source
  ON xp_logs (user_id, reason, source_id);
```

```go
func Award(userID uint, amount int, reason, sourceType string, sourceID uint) (AwardResult, error) {
	return result, db.Transaction(func(tx *gorm.DB) error {
		entry := model.XPLog{UserID: userID, Amount: amount, Reason: reason,
			SourceType: sourceType, SourceID: sourceID}

		insert := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&entry)
		if insert.RowsAffected == 0 {
			return nil // already awarded: a safe no-op
		}
		// lock the user row, add XP, recompute level
	})
}
```

The insert is the *claim*. `ON CONFLICT DO NOTHING` plus `RowsAffected == 0` means "someone already did this". Calling `Award` twice, ten times, or from two concurrent requests credits the XP exactly once. The crucial design question is the **source id**: it must identify the *event*, not just the resource. Awarding XP "per scroll" using `scroll_id` would block a second legitimate event on the same scroll; using the like's primary key does not.

Other natural keys: `(user_id, scroll_id)` for a like, `(provider, event_id)` for webhooks, `(order_id)` for an invoice.

## Pattern 3: Conditional updates (state machines)

Many "non-idempotent" operations become idempotent when expressed as a *transition* guarded by the current state:

```sql
-- approve a pending scroll
UPDATE scrolls
SET status = 'published', published_at = now()
WHERE id = $1 AND status = 'pending';
```

If two reviewers click Approve simultaneously, one update affects 1 row and the other affects 0. The handler checks `RowsAffected` and returns the current state for the loser instead of awarding XP twice. This also protects against double-publishing.

Compare-and-set with a version column does the same for general edits:

```sql
UPDATE profiles SET bio = $1, version = version + 1
WHERE id = $2 AND version = $3;
```

Zero rows affected = someone else changed it; return `409` and let the client re-read.

## Webhooks: you are the idempotent consumer

Providers promise at-least-once delivery. Make the handler:

1. Verify the signature first (do not trust the body otherwise).
2. Insert the provider's `event_id` into a `processed_events` table with a unique constraint.
3. If the insert conflicts, return `200` immediately: already handled.
4. Otherwise do the work **in the same transaction** as the insert, then return `200`.

Returning `200` for duplicates is important; returning an error makes the provider retry forever.

## Testing idempotency

Idempotency bugs hide in races, so test the race:

```go
func TestAwardIsIdempotentUnderConcurrency(t *testing.T) {
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			Award(user.ID, 50, "scroll_published", "scroll", 7)
		}()
	}
	wg.Wait()
	// exactly one row, user.TotalXP == 50
}
```

Run with `-race`, and also kill the process between "claim" and "done" to see what a crash leaves behind. The in-progress state must be recoverable (a timeout that lets a retry take over).

## Decision guide

| Situation | Use |
|---|---|
| Client-initiated create with money or irreversible effect | Idempotency-Key |
| Event with a stable natural id (like, webhook, award) | Unique constraint + `ON CONFLICT DO NOTHING` |
| State transition (approve, cancel, ship) | Conditional `UPDATE ... WHERE status = ...` |
| Replace a resource | `PUT` (already idempotent) |
| Counter increment from retries | Record the event first; derive the counter |

## Closing thoughts

Idempotency is not a feature you bolt on after the first double-charge; it is a property you design into every endpoint that has side effects. Ask one question per endpoint: *"What happens if this runs twice?"* If the answer makes you uncomfortable, pick one of the three patterns and let the database enforce it. The database is the only component that can arbitrate a race.

Further reading: Stripe's engineering post *Designing robust and predictable APIs with idempotency*, the IETF draft *The Idempotency-Key HTTP Header Field*, and RFC 9110 §9.2.2 (idempotent methods).

<!--comments-->
komang_adi: The XP example finally made the 'source id must identify the event' rule click for me. I had been using scroll_id for everything and wondered why a second like never paid out.
sari_dewi: Exactly Komang. Resource id answers "what", the source id must answer "which occurrence".
rizkymaul: What do you do about the in-progress state if the server crashes after claiming the key but before storing the response?
sari_dewi: Add a lock timeout column. If the claim is older than, say, 60 seconds with no response, a retry may take over. For external side effects pass your key to the provider so the retry is safe there too.
raka_m: From the client side I would add: generate the key when the user *intends* the action (button press), not on every fetch attempt. Reusing the same key across automatic retries is the whole point.
bayu_w: Same story with game server purchases. We had a double-grant bug in the Quest store until we keyed receipts by the platform's transaction id.
kevin_h: Making "what happens if this runs twice?" a standing question in design review. Thanks Sari.
