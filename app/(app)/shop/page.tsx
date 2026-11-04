import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { getPortfolio } from "@/lib/data";
import { getPowerupInventory } from "@/lib/arena";
import { ShopView } from "@/components/shop-view";

export const dynamic = "force-dynamic";

type Purchase = {
  id: number;
  pack_id: string;
  pack_name: string;
  credits: number;
  cash_added: number;
  crypto_added: number;
  created_at: number;
};

export default async function ShopPage() {
  const user = await requireUser();
  const portfolio = getPortfolio(user);
  const purchases = all<Purchase>(
    `SELECT id, pack_id, pack_name, credits, cash_added, crypto_added, created_at
     FROM shop_purchases WHERE user_id = ? ORDER BY created_at DESC LIMIT 8`,
    user.id
  );

  return (
    <ShopView
      user={{
        name: user.name,
        credits: user.credits,
        cash: portfolio.cash,
        cryptoCash: portfolio.cryptoCash,
        startCapital: user.start_capital,
        region: user.region,
        verified: Boolean(
          user.id_verified && user.terms_accepted && ["approved", "not_required"].includes(user.guardian_status)
        ),
      }}
      purchases={purchases}
      powerups={{ ...getPowerupInventory(user.id) }}
    />
  );
}
