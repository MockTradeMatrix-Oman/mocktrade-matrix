import "server-only";
import { all, one, run, now, tx, type Asset, type User } from "./db";
import { brokerageFor, slipRate, taxFor, toLocal, toUsd, FX_INR } from "./finance";
import { emitToUser, emit } from "./realtime";
import { getPortfolio } from "./data";

export type TradeResult =
  | { ok: true; order: any; message: string; portfolio: ReturnType<typeof getPortfolio> }
  | { ok: false; error: string };

export function executeOrder(opts: {
  userId: number;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  source?: string;
}): TradeResult {
  const { userId, symbol, side, source = "manual" } = opts;
  const qty = Number(opts.qty);
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: "Quantity must be greater than zero." };
  if (qty > 1_000_000) return { ok: false, error: "Quantity exceeds the simulated order limit." };

  const user = one<User>("SELECT * FROM users WHERE id = ?", userId);
  if (!user) return { ok: false, error: "Account not found." };
  const asset = one<Asset>("SELECT * FROM assets WHERE symbol = ?", symbol);
  if (!asset) return { ok: false, error: "Unknown instrument." };

  const bucket = asset.class === "crypto" ? "crypto" : "main";
  const available = bucket === "crypto" ? user.crypto_cash : user.cash;
  const holding = one<{ qty: number; avg_price: number; realized: number }>(
    "SELECT qty, avg_price, realized FROM holdings WHERE user_id = ? AND symbol = ?",
    userId, symbol
  );

  const slip = slipRate(asset.class);
  const priceLocal = toLocal(asset.price, user.region);
  const executedLocal = priceLocal * (side === "BUY" ? 1 + slip : 1 - slip);
  const executedUsd = asset.price * (side === "BUY" ? 1 + slip : 1 - slip);
  const notional = executedLocal * qty;
  const fee = brokerageFor(asset.class, notional, user.region);

  if (side === "BUY") {
    const total = notional + fee;
    if (total > available + 0.01) {
      return { ok: false, error: `Insufficient ${bucket === "crypto" ? "sandbox " : ""}cash. This order needs ${Math.ceil(total - available).toLocaleString()} more.` };
    }
    const prevQty = holding?.qty ?? 0;
    const prevAvg = holding?.avg_price ?? 0;
    const newQty = prevQty + qty;
    const newAvg = (prevAvg * prevQty + executedUsd * qty) / newQty;
    tx(() => {
      run(
        `INSERT INTO holdings (user_id,symbol,qty,avg_price,realized,bucket) VALUES (?,?,?,?,?,?)
         ON CONFLICT(user_id,symbol) DO UPDATE SET qty = ?, avg_price = ?`,
        userId, symbol, newQty, newAvg, holding?.realized ?? 0, bucket, newQty, newAvg
      );
      if (bucket === "crypto") run("UPDATE users SET crypto_cash = crypto_cash - ? WHERE id = ?", total, userId);
      else run("UPDATE users SET cash = cash - ? WHERE id = ?", total, userId);
      run(
        `INSERT INTO orders (user_id,symbol,side,qty,requested_price,executed_price,notional,fee,tax,slippage,source,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        userId, symbol, side, qty, priceLocal, executedLocal, notional, fee, 0, Math.abs(executedLocal - priceLocal) * qty, source, now()
      );
      run("INSERT INTO transactions (user_id,kind,amount,bucket,note,created_at) VALUES (?,?,?,?,?,?)",
        userId, "trade_buy", -(notional + fee), bucket, `Bought ${qty} ${symbol} @ ${executedLocal.toFixed(2)}`, now());
      run("UPDATE users SET xp = xp + ? WHERE id = ?", Math.max(2, Math.round(notional / 5000)), userId);
    });
  } else {
    if (!holding || holding.qty < qty - 1e-9) {
      return { ok: false, error: `You only hold ${(holding?.qty ?? 0).toFixed(4).replace(/0+$/, "")} ${symbol}.` };
    }
    const gainLocal = (executedLocal - toLocal(holding.avg_price, user.region)) * qty;
    const tax = taxFor(asset.class, gainLocal, user.region);
    const net = notional - fee - tax;
    const newQty = holding.qty - qty;
    tx(() => {
      if (newQty <= 1e-9) {
        run("DELETE FROM holdings WHERE user_id = ? AND symbol = ?", userId, symbol);
      } else {
        run("UPDATE holdings SET qty = ? WHERE user_id = ? AND symbol = ?", newQty, userId, symbol);
      }
      if (bucket === "crypto") run("UPDATE users SET crypto_cash = crypto_cash + ? WHERE id = ?", net, userId);
      else run("UPDATE users SET cash = cash + ? WHERE id = ?", net, userId);
      run(
        `INSERT INTO orders (user_id,symbol,side,qty,requested_price,executed_price,notional,fee,tax,slippage,source,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        userId, symbol, side, qty, priceLocal, executedLocal, notional, fee, tax, Math.abs(executedLocal - priceLocal) * qty, source, now()
      );
      run("INSERT INTO transactions (user_id,kind,amount,bucket,note,created_at) VALUES (?,?,?,?,?,?)",
        userId, "trade_sell", net, bucket, `Sold ${qty} ${symbol} @ ${executedLocal.toFixed(2)}`, now());
      run("UPDATE users SET xp = xp + ? WHERE id = ?", Math.max(2, Math.round(notional / 5000)), userId);
    });
  }

  const updated = one<User>("SELECT * FROM users WHERE id = ?", userId)!;
  const portfolio = getPortfolio(updated);
  const order = one(
    "SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 1",
    userId
  );
  const msg = side === "BUY"
    ? `Bought ${qty} ${symbol} at ${executedLocal.toFixed(2)} (fee ${fee.toFixed(2)})`
    : `Sold ${qty} ${symbol} at ${executedLocal.toFixed(2)} (fee + tax applied)`;

  emitToUser(userId, "portfolio:update", {
    total: portfolio.total, cash: portfolio.cash, cryptoCash: portfolio.cryptoCash,
    dayChange: portfolio.dayChange, dayPct: portfolio.dayPct, credits: updated.credits,
  });
  run("INSERT INTO activity (user_id,type,text,created_at) VALUES (?,?,?,?)",
    userId, "trade", `${updated.name} ${side === "BUY" ? "bought" : "sold"} ${qty} ${symbol}`, now());
  emit("activity:new", {
    text: `${updated.name} ${side === "BUY" ? "bought" : "sold"} ${qty} ${symbol}`,
    name: updated.name, avatar: updated.avatar, type: "trade", created_at: now(),
  });

  return { ok: true, order, message: msg, portfolio };
}

export function portfolioValueLocal(userId: number) {
  const user = one<User>("SELECT * FROM users WHERE id = ?", userId);
  if (!user) return 0;
  const rows = all<{ qty: number; price: number }>(
    `SELECT h.qty, a.price FROM holdings h JOIN assets a ON a.symbol = h.symbol
     WHERE h.user_id = ? AND h.bucket = 'main'`,
    userId
  );
  const fx = user.region === "IN" ? FX_INR : 1;
  return user.cash + rows.reduce((s, r) => s + r.qty * r.price * fx, 0);
}

export function creditsForUser(userId: number, amount: number, note: string) {
  run("UPDATE users SET credits = credits + ? WHERE id = ?", amount, userId);
  run("INSERT INTO transactions (user_id,kind,amount,bucket,note,created_at) VALUES (?,?,?,?,?,?)",
    userId, "credit", amount, "credits", note, now());
  const u = one<{ credits: number }>("SELECT credits FROM users WHERE id = ?", userId);
  emitToUser(userId, "credits:update", { credits: u?.credits ?? 0, delta: amount, note });
  return u?.credits ?? 0;
}

export function notify(userId: number, type: string, title: string, body: string) {
  const r = run(
    "INSERT INTO notifications (user_id,type,title,body,read,created_at) VALUES (?,?,?,?,0,?)",
    userId, type, title, body, now()
  );
  emitToUser(userId, "notification", { id: r.lastId, type, title, body, created_at: now() });
}
