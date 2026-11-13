/**
 * The final assessment question bank.
 *
 * These questions are deliberately separate from the short module quizzes: the
 * module quizzes check recall immediately after a lesson, while the final paper
 * checks that the same ideas can be applied. Every question maps to exactly one
 * published module through its slug, so the exam can report a module-wise
 * breakdown and keep the paper balanced across the curriculum.
 *
 * 52 questions are authored so a 50-question paper can leave two out and still
 * cover all eight modules. Difficulty is moderate-to-hard with a few easy
 * warm-ups, matching a JEE-Mains style CBT.
 */
export type ExamDifficulty = "easy" | "moderate" | "hard";

export type ExamBankQuestion = {
  module: string;
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty: ExamDifficulty;
};

export const FINAL_EXAM_BANK: ExamBankQuestion[] = [
  /* ------------------------------------------------------------------ */
  /* Money, Markets & Risk                                               */
  /* ------------------------------------------------------------------ */
  {
    module: "money-markets-risk",
    prompt: "What does a market price actually represent?",
    options: [
      "The true long-term value of the asset",
      "The last agreement between a buyer and a seller",
      "A guarantee set by the exchange",
      "The company's audited net worth",
    ],
    correct: 1,
    explanation:
      "A price is the most recent transaction both sides accepted. It is information about current belief, not intrinsic truth.",
    difficulty: "easy",
  },
  {
    module: "money-markets-risk",
    prompt: "In a continuous auction, every purchase means…",
    options: [
      "nobody takes the other side",
      "someone is selling, often with a different view",
      "the exchange sets a new fair value",
      "the price can never fall afterwards",
    ],
    correct: 1,
    explanation:
      "Every buy is matched by a sell. The other side may be calmer, better sized, or simply have a different time horizon.",
    difficulty: "moderate",
  },
  {
    module: "money-markets-risk",
    prompt: "Which statement best captures risk in this programme?",
    options: [
      "How often a price moves up and down",
      "The chance you are forced out before your thesis plays out",
      "The brokerage you pay per trade",
      "The number of shares you own",
    ],
    correct: 1,
    explanation:
      "Survival risk dominates. If you cannot stay in the position, eventually being right does not help.",
    difficulty: "moderate",
  },
  {
    module: "money-markets-risk",
    prompt: "Before entering a trade you should define…",
    options: [
      "only the upside target",
      "the maximum loss you accept and what invalidates the idea",
      "what a stranger on social media is buying",
      "the exact colour of the next candle",
    ],
    correct: 1,
    explanation:
      "Naming your loss limit and invalidation turns a guess into a risk-managed decision.",
    difficulty: "easy",
  },
  {
    module: "money-markets-risk",
    prompt: "\u201cReturns compound, but so do mistakes\u201d means…",
    options: [
      "a mistake only costs you once",
      "fees, taxes and impulsive decisions also compound against you",
      "losses always recover on their own",
      "compounding applies only to winners",
    ],
    correct: 1,
    explanation:
      "Friction and repeated errors compound just like returns. Small recurring leaks can outweigh a decent strategy.",
    difficulty: "moderate",
  },
  {
    module: "money-markets-risk",
    prompt: "\u201cPrice is information, not truth\u201d means a price reflects…",
    options: [
      "an asset's permanent worth",
      "what participants believe right now",
      "an exchange guarantee",
      "audited company accounts",
    ],
    correct: 1,
    explanation:
      "Prices aggregate current expectations. They can be wrong for long stretches because they are beliefs, not verdicts.",
    difficulty: "hard",
  },
  {
    module: "money-markets-risk",
    prompt: "Why does position sizing matter more than prediction?",
    options: [
      "Larger positions always earn more",
      "Survival depends on losses you can actually absorb",
      "Sizing removes every risk",
      "Prediction is illegal in markets",
    ],
    correct: 1,
    explanation:
      "Even a good prediction can be ruined by an oversized position. Sizing keeps one bad outcome from ending the game.",
    difficulty: "moderate",
  },

  /* ------------------------------------------------------------------ */
  /* How Prices Actually Move                                            */
  /* ------------------------------------------------------------------ */
  {
    module: "how-prices-move",
    prompt: "A price ticks up when…",
    options: [
      "sellers accept the bid",
      "buyers are willing to pay the ask",
      "volume drops to zero",
      "the exchange cuts its fees",
    ],
    correct: 1,
    explanation:
      "Impatient buyers lift the ask. Impatient sellers hit the bid. That imbalance is what moves the last traded price.",
    difficulty: "easy",
  },
  {
    module: "how-prices-move",
    prompt: "Liquidity is the market's ability to…",
    options: [
      "guarantee a profit",
      "absorb your order without moving the price much",
      "set the company's value",
      "remove all taxes",
    ],
    correct: 1,
    explanation:
      "A liquid market lets size trade without a large price concession. Thin markets do not.",
    difficulty: "moderate",
  },
  {
    module: "how-prices-move",
    prompt: "What is slippage?",
    options: [
      "A broker's fixed fee",
      "The gap between the requested and executed price",
      "A tax on realised profits",
      "The spread between two exchanges",
    ],
    correct: 1,
    explanation:
      "Slippage is execution drift: your order fills at a worse price than the one you saw on screen.",
    difficulty: "easy",
  },
  {
    module: "how-prices-move",
    prompt: "A large order in a thin order book usually…",
    options: [
      "fills entirely at the screen price",
      "walks the book and fills at progressively worse levels",
      "is rejected by the regulator",
      "has no market impact",
    ],
    correct: 1,
    explanation:
      "Thin depth cannot absorb size at one level. The order consumes each level in turn, widening the average fill price.",
    difficulty: "moderate",
  },
  {
    module: "how-prices-move",
    prompt: "A sharp price rise on very thin volume is often…",
    options: [
      "strong institutional conviction",
      "a fragile move that can reverse easily",
      "a guaranteed breakout",
      "proof of an acquisition",
    ],
    correct: 1,
    explanation:
      "Without volume, few participants validated the move. Thin moves are easier to reverse.",
    difficulty: "moderate",
  },
  {
    module: "how-prices-move",
    prompt:
      "Two companies report identical numbers, but their shares react in opposite directions. Why?",
    options: [
      "Markets are pure randomness",
      "Each company's expectations were already priced differently",
      "One report must be fake",
      "Exchanges use different currencies",
    ],
    correct: 1,
    explanation:
      "The surprise relative to expectations drives order flow. Identical results can be a beat for one company and a miss for another.",
    difficulty: "hard",
  },
  {
    module: "how-prices-move",
    prompt:
      "\u201cRead a chart as a record of decisions, not a prophecy\u201d means a chart…",
    options: [
      "predicts every future tick",
      "shows what participants have already done",
      "removes the need for risk management",
      "only works for crypto",
    ],
    correct: 1,
    explanation:
      "A chart is history: orders, decisions and participation. It informs odds; it does not guarantee the next move.",
    difficulty: "hard",
  },

  /* ------------------------------------------------------------------ */
  /* The Cost of Trading                                                 */
  /* ------------------------------------------------------------------ */
  {
    module: "cost-of-trading",
    prompt: "Which cost applies even when a trade is profitable?",
    options: [
      "Only capital gains tax",
      "Brokerage and slippage, plus tax on the realised gain",
      "Nothing — profit covers everything",
      "Only the exchange's listing fee",
    ],
    correct: 1,
    explanation:
      "Brokerage and slippage hit every fill; tax applies on top of a realised gain.",
    difficulty: "easy",
  },
  {
    module: "cost-of-trading",
    prompt: "Capital gains tax is charged on…",
    options: [
      "unrealised paper gains",
      "realised profits when you sell",
      "every buy order",
      "your total portfolio value",
    ],
    correct: 1,
    explanation:
      "Tax events happen on realisation. Holding an appreciated asset does not trigger capital gains tax.",
    difficulty: "moderate",
  },
  {
    module: "cost-of-trading",
    prompt:
      "You buy at \u20b9100 and sell at \u20b9100.40. With 0.25% brokerage and 0.15% slippage per side, you most likely…",
    options: [
      "made a small profit",
      "broke even",
      "lost money after friction",
      "earned exactly \u20b90.40 per share",
    ],
    correct: 2,
    explanation:
      "Friction of about 0.40% per side exceeds the 0.40% gross move once both legs are counted.",
    difficulty: "hard",
  },
  {
    module: "cost-of-trading",
    prompt: "If your edge is smaller than your friction, you…",
    options: [
      "have a small edge",
      "do not have an edge",
      "should trade more often",
      "pay no tax",
    ],
    correct: 1,
    explanation:
      "Friction consumes the edge. Trading more often only enlarges the donation to the exchange.",
    difficulty: "moderate",
  },
  {
    module: "cost-of-trading",
    prompt: "An unrealised gain…",
    options: [
      "creates an immediate tax bill",
      "does not trigger tax until the position is sold",
      "is taxed every month",
      "avoids brokerage",
    ],
    correct: 1,
    explanation:
      "Paper gains are not tax events. Selling creates the liability, which is why timing of a sale matters.",
    difficulty: "moderate",
  },
  {
    module: "cost-of-trading",
    prompt: "Why is high trading frequency dangerous?",
    options: [
      "It guarantees better fills",
      "Every trade adds brokerage and slippage that compound against you",
      "Exchanges ban frequent traders",
      "Taxes fall as frequency rises",
    ],
    correct: 1,
    explanation:
      "Each round trip pays friction. A strategy can look profitable before costs and lose money after them.",
    difficulty: "hard",
  },

  /* ------------------------------------------------------------------ */
  /* Reading a Balance Sheet                                             */
  /* ------------------------------------------------------------------ */
  {
    module: "reading-balance-sheet",
    prompt: "A balance sheet is best described as…",
    options: [
      "a video of earnings over a period",
      "a photograph of what a company owns and owes at a point in time",
      "a tax return",
      "a price chart",
    ],
    correct: 1,
    explanation:
      "The balance sheet is a snapshot: assets, liabilities and what remains for shareholders.",
    difficulty: "easy",
  },
  {
    module: "reading-balance-sheet",
    prompt: "Which statement acts as the lie detector on reported profit?",
    options: [
      "The balance sheet",
      "The income statement",
      "The cash flow statement",
      "The CEO's letter",
    ],
    correct: 2,
    explanation:
      "Operating cash flow reveals whether accounting profit is converting into real cash.",
    difficulty: "moderate",
  },
  {
    module: "reading-balance-sheet",
    prompt: "A current ratio below 1 means…",
    options: [
      "more current liabilities than current assets",
      "the company is definitely bankrupt",
      "the shares are undervalued",
      "the company pays no tax",
    ],
    correct: 0,
    explanation:
      "Short-term obligations exceed short-term resources. That is a liquidity question to investigate, not an automatic death sentence.",
    difficulty: "moderate",
  },
  {
    module: "reading-balance-sheet",
    prompt:
      "Net income rises but operating cash flow does not. What should you investigate?",
    options: [
      "The logo and marketing",
      "Receivables and inventory",
      "The ticker symbol",
      "The dividend history alone",
    ],
    correct: 1,
    explanation:
      "Profit that does not turn into cash often sits in unpaid receivables or unsold inventory.",
    difficulty: "hard",
  },
  {
    module: "reading-balance-sheet",
    prompt: "A low P/E ratio on its own…",
    options: [
      "means the stock is cheap",
      "says nothing until compared with growth, risk and peers",
      "proves the company is growing fast",
      "guarantees dividends",
    ],
    correct: 1,
    explanation:
      "Valuation multiples are relative. A low P/E can signal value or collapsing earnings.",
    difficulty: "moderate",
  },
  {
    module: "reading-balance-sheet",
    prompt:
      "Where do leases, contingencies and related-party transactions usually hide?",
    options: [
      "In the share price",
      "In the footnotes",
      "In the ticker",
      "In the logo",
    ],
    correct: 1,
    explanation:
      "The footnotes carry the detail that explains the numbers — and often the most useful questions.",
    difficulty: "hard",
  },
  {
    module: "reading-balance-sheet",
    prompt:
      "Rising revenue funded by rising borrowings differs from rising revenue funded by cash because…",
    options: [
      "debt has no cost",
      "growth may depend on debt rather than profit",
      "cash is always bad",
      "borrowings directly increase profit",
    ],
    correct: 1,
    explanation:
      "Two companies can show the same growth with very different durability. Check what is funding it.",
    difficulty: "moderate",
  },

  /* ------------------------------------------------------------------ */
  /* Diversification & ETFs                                              */
  /* ------------------------------------------------------------------ */
  {
    module: "diversification-etfs",
    prompt: "Owning ten technology stocks is…",
    options: [
      "strong diversification",
      "one concentrated sector bet with ten tickers",
      "a hedge against a tech selloff",
      "identical to owning an index fund",
    ],
    correct: 1,
    explanation:
      "Diversification needs different drivers, not more names exposed to the same driver.",
    difficulty: "moderate",
  },
  {
    module: "diversification-etfs",
    prompt: "What does correlation describe?",
    options: [
      "A fund's total return",
      "How closely two assets move together",
      "The fee an ETF charges",
      "The number of holdings in a basket",
    ],
    correct: 1,
    explanation:
      "Correlation measures co-movement. Low correlation is what makes diversification useful.",
    difficulty: "easy",
  },
  {
    module: "diversification-etfs",
    prompt: "Diversification works best when the assets…",
    options: [
      "all rise together",
      "do not have their bad days at the same time",
      "belong to the same sector",
      "are all in one currency",
    ],
    correct: 1,
    explanation:
      "The goal is a mix whose failures are not synchronised. Ten tickers that crash together are one risk.",
    difficulty: "hard",
  },
  {
    module: "diversification-etfs",
    prompt: "A market-cap-weighted index can become…",
    options: [
      "perfectly diversified",
      "dangerously concentrated in a few mega-caps",
      "free of all fees",
      "immune to drawdowns",
    ],
    correct: 1,
    explanation:
      "As winners grow, their index weight grows. A market-cap index can quietly become a concentrated bet.",
    difficulty: "moderate",
  },
  {
    module: "diversification-etfs",
    prompt: "The ETF costs that matter most are…",
    options: [
      "only the brokerage fee",
      "expense ratio, tracking difference and trading spread",
      "the fund's logo and marketing",
      "the number of shares outstanding",
    ],
    correct: 1,
    explanation:
      "Ongoing expense, tracking quality and spread determine the real cost of ownership.",
    difficulty: "hard",
  },
  {
    module: "diversification-etfs",
    prompt: "Why does a 1.5% annual fee matter so much?",
    options: [
      "It is charged only once",
      "It compounds against you for as long as you hold the fund",
      "It applies only to profits",
      "It is refunded at exit",
    ],
    correct: 1,
    explanation:
      "A small-looking annual drag compounds over decades and can consume a large share of the final corpus.",
    difficulty: "moderate",
  },

  /* ------------------------------------------------------------------ */
  /* Insurance & Protection                                              */
  /* ------------------------------------------------------------------ */
  {
    module: "insurance-protection",
    prompt: "The main purpose of insurance is to…",
    options: [
      "generate investment returns",
      "transfer a catastrophic risk you cannot self-fund",
      "avoid paying taxes",
      "beat inflation",
    ],
    correct: 1,
    explanation:
      "Insurance is risk transfer, not a return engine. It protects against losses too large to carry alone.",
    difficulty: "easy",
  },
  {
    module: "insurance-protection",
    prompt: "A higher deductible usually means…",
    options: [
      "a higher premium",
      "a lower premium but more out-of-pocket before cover",
      "more cover with no trade-off",
      "the policy is fraudulent",
    ],
    correct: 1,
    explanation:
      "You accept more of the small losses in exchange for a lower premium. It is only cheap if nothing small goes wrong.",
    difficulty: "moderate",
  },
  {
    module: "insurance-protection",
    prompt: "Term life is 'pure protection' because…",
    options: [
      "it has a large cash-value component",
      "it pays only on death and has no investment wrapper",
      "it is free",
      "it covers health expenses",
    ],
    correct: 1,
    explanation:
      "Term cover is protection only, with no bundled savings or cash value.",
    difficulty: "moderate",
  },
  {
    module: "insurance-protection",
    prompt: "A low premium with a very high deductible is…",
    options: [
      "always the cheapest option",
      "a bet that nothing small goes wrong",
      "the best of both worlds",
      "the same as having no cover",
    ],
    correct: 1,
    explanation:
      "The low headline premium hides a large out-of-pocket gap. Read the deductible before calling it cheap.",
    difficulty: "hard",
  },
  {
    module: "insurance-protection",
    prompt: "A high premium with a low cover limit is often…",
    options: [
      "ideal protection",
      "the worst of both worlds",
      "identical to term life",
      "required by law",
    ],
    correct: 1,
    explanation:
      "You pay a lot and still carry most of the catastrophic risk yourself.",
    difficulty: "hard",
  },
  {
    module: "insurance-protection",
    prompt: "The right question when buying protection is…",
    options: [
      "What will this pay me back?",
      "Which catastrophic loss can I no longer carry?",
      "How does it beat the index?",
      "How many policies can I stack?",
    ],
    correct: 1,
    explanation:
      "Start from the loss you cannot absorb. The product should fit that risk, not a return target.",
    difficulty: "moderate",
  },

  /* ------------------------------------------------------------------ */
  /* Crypto, Carefully                                                   */
  /* ------------------------------------------------------------------ */
  {
    module: "crypto-carefully",
    prompt: "Crypto assets…",
    options: [
      "pay regular earnings",
      "trade 24/7 and have no earnings",
      "are fixed-income securities",
      "are insured bank deposits",
    ],
    correct: 1,
    explanation:
      "Crypto trades around the clock and has no cash flows. That makes it a different risk category, not a savings account.",
    difficulty: "easy",
  },
  {
    module: "crypto-carefully",
    prompt: "Why is crypto kept in an isolated sandbox here?",
    options: [
      "To increase leverage",
      "To cap speculative risk so it cannot damage core savings",
      "Because crypto cannot be priced",
      "To avoid all taxes",
    ],
    correct: 1,
    explanation:
      "Isolation enforces position sizing: speculative capital is capped by design.",
    difficulty: "moderate",
  },
  {
    module: "crypto-carefully",
    prompt: "A 50% crypto drawdown should be treated as…",
    options: [
      "impossible",
      "a normal risk of the asset class",
      "proof of fraud",
      "a guaranteed buying opportunity",
    ],
    correct: 1,
    explanation:
      "Extreme drawdowns are a known, recurring feature of crypto volatility.",
    difficulty: "moderate",
  },
  {
    module: "crypto-carefully",
    prompt: "The right size for a speculative position is one where…",
    options: [
      "you use maximum available capital",
      "a total loss changes your life by zero",
      "you borrow to make it larger",
      "it exceeds your emergency fund",
    ],
    correct: 1,
    explanation:
      "Position sizing is defined by tolerable loss, not conviction. If it keeps you awake, it is too large.",
    difficulty: "hard",
  },
  {
    module: "crypto-carefully",
    prompt: "Custody risk asks…",
    options: [
      "who holds the keys and what happens if they are lost",
      "what the next candle will be",
      "how many followers you have",
      "what last year's fee schedule was",
    ],
    correct: 0,
    explanation:
      "With digital assets, control of the keys is control of the asset. Loss or compromise is a distinct risk.",
    difficulty: "moderate",
  },
  {
    module: "crypto-carefully",
    prompt: "Liquidity and fee risk matter because spreads tend to…",
    options: [
      "stay constant",
      "widen exactly when you most want to sell",
      "vanish in a crash",
      "be capped by exchanges",
    ],
    correct: 1,
    explanation:
      "Liquidity is fragile. In stress, spreads widen and the exit you planned becomes more expensive.",
    difficulty: "hard",
  },

  /* ------------------------------------------------------------------ */
  /* Algorithmic Thinking                                                */
  /* ------------------------------------------------------------------ */
  {
    module: "algorithmic-thinking",
    prompt: "Which is a properly specified trading rule?",
    options: [
      "Buy when the stock looks strong",
      "Buy 10 shares if the 20-day average crosses above the 50-day average and RSI is below 70",
      "Buy because a friend did",
      "Buy at a good price",
    ],
    correct: 1,
    explanation:
      "A machine-executable rule names quantity, instrument context and checkable conditions.",
    difficulty: "easy",
  },
  {
    module: "algorithmic-thinking",
    prompt: "The four parts of a complete strategy are…",
    options: [
      "universe, signal, sizing and exit",
      "entry, hope, luck and exit",
      "chart, news, gossip and stop",
      "fee, tax, logo and slogan",
    ],
    correct: 0,
    explanation:
      "Decide what you may trade, when to act, how much to risk, and when to close — including a stop.",
    difficulty: "moderate",
  },
  {
    module: "algorithmic-thinking",
    prompt: "Backtesting is best described as…",
    options: [
      "a guarantee of future returns",
      "a sanity check against history that can overfit",
      "a way to avoid fees",
      "a regulatory requirement",
    ],
    correct: 1,
    explanation:
      "Backtests validate plausibility. They are not promises, and heavy tuning can make them meaningless.",
    difficulty: "moderate",
  },
  {
    module: "algorithmic-thinking",
    prompt: "What does overfitting mean?",
    options: [
      "Tuning a rule until it fits the past but fails forward",
      "Trading too many shares",
      "Using too few indicators",
      "Holding a position too long",
    ],
    correct: 0,
    explanation:
      "Overfitted rules memorise noise instead of capturing a durable edge.",
    difficulty: "hard",
  },
  {
    module: "algorithmic-thinking",
    prompt: "Why prefer a simple rule with a plausible economic reason?",
    options: [
      "Complexity always wins",
      "It is less likely to memorise noise and more likely to survive forward",
      "It needs no testing",
      "It cannot lose money",
    ],
    correct: 1,
    explanation:
      "Simple rules with a reason behind them generalise better than curves fitted to the past.",
    difficulty: "hard",
  },
  {
    module: "algorithmic-thinking",
    prompt: "A sensible first algorithmic experiment is…",
    options: [
      "many conditions across many instruments",
      "one condition, one instrument and a hard position limit",
      "maximum leverage with no stop",
      "a rule with no exit",
    ],
    correct: 1,
    explanation:
      "Start small and controlled. One condition, one instrument and a hard limit makes the result interpretable.",
    difficulty: "moderate",
  },
  {
    module: "algorithmic-thinking",
    prompt: "The course says complexity is not an edge. What is?",
    options: ["Luck", "Discipline", "Leverage", "Frequency"],
    correct: 1,
    explanation:
      "Rules only help if they are followed. Discipline is the edge; complexity is usually decoration.",
    difficulty: "easy",
  },
];

export const FINAL_EXAM_BANK_SIZE = FINAL_EXAM_BANK.length;
