/**
 * Quiz arena question bank.
 *
 * Two sources are mixed at match time:
 *   1. a curated bank of objective finance / markets / economics questions,
 *      with India- and US-specific entries, and
 *   2. procedural generators that build exact-answer maths questions with
 *      fresh numbers on every match.
 *
 * The union means no two matches feel identical, while every question keeps a
 * single, checkable correct answer. Questions are shuffled and options are
 * shuffled per match before they are sent to the two players.
 */

const CURATED = [
  /* ---------------- markets basics ---------------- */
  {
    cat: "Markets", region: "G", level: 1,
    q: "Buying a share of stock makes you:",
    options: ["A part-owner of the company", "A lender to the company", "A customer of the company", "An employee of the company"],
    correct: 0,
    why: "A share is a unit of ownership. A bond, by contrast, is a loan.",
  },
  {
    cat: "Markets", region: "G", level: 1,
    q: "A bond is best described as:",
    options: ["A loan to an issuer", "Part-ownership of a company", "A physical commodity", "A type of insurance"],
    correct: 0,
    why: "The bondholder lends money and is promised interest plus principal back.",
  },
  {
    cat: "Markets", region: "G", level: 1,
    q: "A stock index measures:",
    options: ["The value of a basket of companies", "The profit of one company", "The interest rate set by a bank", "The price of gold only"],
    correct: 0,
    why: "An index tracks a defined basket, so it shows the direction of a market segment.",
  },
  {
    cat: "Markets", region: "G", level: 1,
    q: "An ETF is a fund that:",
    options: ["Trades on an exchange like a stock", "Can only be bought from a bank", "Guarantees a fixed return", "Holds only government bonds"],
    correct: 0,
    why: "Exchange-traded funds track an index or basket and trade intraday like shares.",
  },
  {
    cat: "Markets", region: "G", level: 1,
    q: "A bear market describes:",
    options: ["A sustained fall in prices", "A sustained rise in prices", "A market that is closed", "A market with no volume"],
    correct: 0,
    why: "Bear = falling. Bull = rising. The names come from how each animal attacks.",
  },
  {
    cat: "Markets", region: "G", level: 1,
    q: "Liquidity describes how:",
    options: ["Easily an asset can be traded without moving its price", "Profitable a company is", "Large a company's debt is", "Often a stock pays dividends"],
    correct: 0,
    why: "Liquid markets have many buyers and sellers, so trades fill quickly at fair prices.",
  },
  {
    cat: "Markets", region: "G", level: 2,
    q: "A blue-chip company is usually:",
    options: ["Large, established and financially sound", "A newly listed startup", "A company with no revenue", "A government department"],
    correct: 0,
    why: "Blue chips are the large, durable names that anchor most indices.",
  },
  {
    cat: "Markets", region: "G", level: 2,
    q: "A stock split:",
    options: ["Increases the number of shares without changing total value", "Doubles every shareholder's wealth", "Raises new money for the company", "Reduces the company's debt"],
    correct: 0,
    why: "Each share is divided into more pieces. The pie is sliced thinner, not bigger.",
  },
  {
    cat: "Markets", region: "G", level: 2,
    q: "A share buyback is when a company:",
    options: ["Buys back its own shares from the market", "Buys a competitor", "Sells new shares to the public", "Cancels its dividend forever"],
    correct: 0,
    why: "Buybacks reduce the share count, which can lift earnings per share.",
  },
  {
    cat: "Markets", region: "G", level: 1,
    q: "IPO stands for:",
    options: ["Initial public offering", "Indian price outlook", "Indexed portfolio option", "Interest payment order"],
    correct: 0,
    why: "An IPO is the first time a private company sells shares to the public.",
  },

  /* ---------------- trading mechanics ---------------- */
  {
    cat: "Trading", region: "G", level: 2,
    q: "A stop-loss order is designed to:",
    options: ["Sell when the price falls to a chosen level", "Buy more as the price falls", "Guarantee a profit", "Freeze the price for the day"],
    correct: 0,
    why: "It caps the loss you are willing to take on a position.",
  },
  {
    cat: "Trading", region: "G", level: 2,
    q: "A limit order executes:",
    options: ["Only at your price or better", "At any price, immediately", "Only after the market closes", "Only at the opening price"],
    correct: 0,
    why: "A limit sets the worst price you will accept; it may never fill.",
  },
  {
    cat: "Trading", region: "G", level: 2,
    q: "The bid-ask spread is:",
    options: ["The gap between the best buy and best sell price", "The fee a broker charges", "The difference between today's high and low", "The tax on a sale"],
    correct: 0,
    why: "The spread is a hidden cost: you buy at the ask and sell at the bid.",
  },
  {
    cat: "Trading", region: "G", level: 2,
    q: "Slippage is:",
    options: ["The difference between expected and executed price", "A dividend paid late", "A penalty for day trading", "The interest on margin"],
    correct: 0,
    why: "Fast-moving or thin markets can fill your order away from the quoted price.",
  },
  {
    cat: "Trading", region: "G", level: 2,
    q: "Buying on margin means:",
    options: ["Borrowing money to invest", "Buying only index funds", "Selling shares you do not own", "Investing without a broker"],
    correct: 0,
    why: "Margin amplifies both gains and losses, and can trigger a margin call.",
  },
  {
    cat: "Trading", region: "G", level: 3,
    q: "Short selling makes a profit when:",
    options: ["The price falls", "The price rises", "The company pays a dividend", "The market closes early"],
    correct: 0,
    why: "You sell borrowed shares, hoping to buy them back cheaper later.",
  },
  {
    cat: "Trading", region: "G", level: 3,
    q: "A market maker's main job is to:",
    options: ["Provide liquidity by quoting both buy and sell prices", "Predict the next crash", "Set the government's interest rate", "Audit listed companies"],
    correct: 0,
    why: "Market makers earn the spread by standing ready to trade both sides.",
  },

  /* ---------------- valuation ---------------- */
  {
    cat: "Valuation", region: "G", level: 2,
    q: "The price-to-earnings (P/E) ratio is:",
    options: ["Share price divided by earnings per share", "Earnings divided by share price", "Dividend divided by share price", "Debt divided by equity"],
    correct: 0,
    why: "P/E tells you how many rupees or dollars investors pay per unit of profit.",
  },
  {
    cat: "Valuation", region: "G", level: 2,
    q: "A higher P/E ratio generally means investors:",
    options: ["Pay more for each unit of current earnings", "Receive a higher dividend", "Face less risk", "Own more of the company"],
    correct: 0,
    why: "It can signal expected growth — or simply an expensive stock.",
  },
  {
    cat: "Valuation", region: "G", level: 2,
    q: "Market capitalisation equals:",
    options: ["Share price multiplied by shares outstanding", "Revenue minus expenses", "Total debt plus cash", "Annual dividend multiplied by shares"],
    correct: 0,
    why: "Market cap is what the market says the whole equity is worth.",
  },
  {
    cat: "Valuation", region: "G", level: 2,
    q: "Dividend yield is:",
    options: ["Annual dividend per share divided by share price", "Share price divided by annual dividend", "Total dividend divided by revenue", "Dividend divided by earnings"],
    correct: 0,
    why: "It expresses the cash income a stock pays relative to its price.",
  },
  {
    cat: "Valuation", region: "G", level: 3,
    q: "Earnings per share (EPS) is calculated as:",
    options: ["Net profit divided by shares outstanding", "Share price divided by net profit", "Revenue divided by assets", "Dividends divided by shares"],
    correct: 0,
    why: "EPS is the profit attributable to each share, the denominator of P/E.",
  },
  {
    cat: "Valuation", region: "G", level: 3,
    q: "A company trading below its book value may be:",
    options: ["Cheap, or priced for real trouble", "Guaranteed to double", "Debt free", "Paying no tax"],
    correct: 0,
    why: "Low price-to-book can be a bargain or a warning — context matters.",
  },

  /* ---------------- risk ---------------- */
  {
    cat: "Risk", region: "G", level: 1,
    q: "Diversification mainly reduces:",
    options: ["Company-specific risk", "Inflation", "Taxes", "Currency conversion fees"],
    correct: 0,
    why: "Spreading holdings dilutes the damage any one company can do.",
  },
  {
    cat: "Risk", region: "G", level: 2,
    q: "If a stock falls 50%, the gain needed to break even is:",
    options: ["100%", "50%", "25%", "75%"],
    correct: 0,
    why: "From 50 you need to double back to 100 — that is a 100% gain.",
  },
  {
    cat: "Risk", region: "G", level: 2,
    q: "Volatility measures:",
    options: ["How much a price moves over time", "How much a company earns", "How large a dividend is", "How liquid a bond is"],
    correct: 0,
    why: "Higher volatility means a wider range of outcomes, up and down.",
  },
  {
    cat: "Risk", region: "G", level: 3,
    q: "Beta measures a stock's:",
    options: ["Sensitivity to moves in the overall market", "Dividend history", "Debt maturity", "Trading volume"],
    correct: 0,
    why: "A beta above 1 tends to amplify market moves; below 1 dampens them.",
  },
  {
    cat: "Risk", region: "G", level: 2,
    q: "Which is generally the riskiest single holding?",
    options: ["One small-cap stock", "A broad index fund", "A government bond", "A savings account"],
    correct: 0,
    why: "A single small company can fail outright; broad funds spread that risk.",
  },
  {
    cat: "Risk", region: "G", level: 2,
    q: "Currency risk affects an investor when:",
    options: ["Assets are denominated in a foreign currency", "They hold only local cash", "They buy a domestic index fund", "They pay a brokerage fee"],
    correct: 0,
    why: "Exchange-rate moves can add to or erase the return on foreign assets.",
  },

  /* ---------------- personal finance ---------------- */
  {
    cat: "Personal finance", region: "G", level: 1,
    q: "Compound interest means:",
    options: ["Interest earns interest over time", "Interest is paid only at maturity", "Interest is tax free", "Interest never changes"],
    correct: 0,
    why: "Reinvested returns grow the base, so growth accelerates over time.",
  },
  {
    cat: "Personal finance", region: "G", level: 1,
    q: "Inflation reduces:",
    options: ["The purchasing power of money", "The number of shares you own", "Your tax rate", "The size of a loan"],
    correct: 0,
    why: "The same amount of money buys less as prices rise.",
  },
  {
    cat: "Personal finance", region: "G", level: 2,
    q: "Real return equals:",
    options: ["Nominal return minus inflation", "Nominal return plus inflation", "Dividends minus fees", "Interest plus tax"],
    correct: 0,
    why: "Real return is what your money actually buys after prices rise.",
  },
  {
    cat: "Personal finance", region: "G", level: 1,
    q: "An emergency fund should typically cover:",
    options: ["3 to 6 months of expenses", "One week of expenses", "Exactly one month of rent", "Your entire net worth"],
    correct: 0,
    why: "A buffer of a few months absorbs job loss or a sudden bill without selling investments.",
  },
  {
    cat: "Personal finance", region: "G", level: 2,
    q: "The 50/30/20 rule splits income into:",
    options: ["50% needs, 30% wants, 20% savings", "50% savings, 30% needs, 20% wants", "50% rent, 30% food, 20% travel", "50% stocks, 30% bonds, 20% cash"],
    correct: 0,
    why: "A simple budget anchor: essentials, lifestyle, and future you.",
  },
  {
    cat: "Personal finance", region: "G", level: 2,
    q: "The main purpose of insurance is to:",
    options: ["Transfer a large risk to an insurer", "Guarantee investment returns", "Avoid all taxes", "Replace an emergency fund"],
    correct: 0,
    why: "You pay a small known premium to avoid a rare, ruinous loss.",
  },
  {
    cat: "Personal finance", region: "G", level: 2,
    q: "Capital gains tax is usually charged when:",
    options: ["You sell an asset at a profit", "You buy an asset", "You hold an asset", "You read the price"],
    correct: 0,
    why: "The gain is realised — and taxed — at the point of sale, not while held.",
  },
  {
    cat: "Personal finance", region: "G", level: 2,
    q: "A longer investment horizon usually allows you to:",
    options: ["Accept more short-term volatility", "Avoid all risk", "Guarantee a higher return", "Skip diversification"],
    correct: 0,
    why: "Time gives markets room to recover, so short dips matter less.",
  },

  /* ---------------- funds ---------------- */
  {
    cat: "Funds", region: "G", level: 2,
    q: "An index fund aims to:",
    options: ["Match the return of an index", "Beat the market every year", "Hold only one stock", "Guarantee capital"],
    correct: 0,
    why: "Index funds replicate a benchmark cheaply instead of trying to beat it.",
  },
  {
    cat: "Funds", region: "G", level: 2,
    q: "An expense ratio is:",
    options: ["A fund's annual fee as a percentage of assets", "The tax on dividends", "The spread on a trade", "The fund's total return"],
    correct: 0,
    why: "Even 1% a year compounds into a large drag over decades.",
  },
  {
    cat: "Funds", region: "G", level: 2,
    q: "Active investing tries to:",
    options: ["Beat the market", "Exactly match the market", "Avoid all equities", "Eliminate fees"],
    correct: 0,
    why: "Active managers pick securities hoping to outperform a benchmark.",
  },
  {
    cat: "Funds", region: "G", level: 3,
    q: "Rebalancing a portfolio means:",
    options: ["Restoring holdings to their target weights", "Selling everything at a peak", "Buying only the best performer", "Closing the account"],
    correct: 0,
    why: "It trims what has grown and tops up what has shrunk, controlling risk.",
  },

  /* ---------------- india ---------------- */
  {
    cat: "India", region: "IN", level: 1,
    q: "The Nifty 50 index tracks:",
    options: ["50 large companies listed in India", "50 US technology stocks", "50 government bonds", "50 crypto assets"],
    correct: 0,
    why: "It is the flagship large-cap index of the National Stock Exchange.",
  },
  {
    cat: "India", region: "IN", level: 1,
    q: "The Sensex is the benchmark index of:",
    options: ["The Bombay Stock Exchange", "The Reserve Bank of India", "SEBI", "The National Stock Exchange"],
    correct: 0,
    why: "The Sensex tracks major companies listed on the BSE.",
  },
  {
    cat: "India", region: "IN", level: 1,
    q: "The Reserve Bank of India is:",
    options: ["India's central bank", "India's largest private bank", "A stock exchange", "A mutual fund house"],
    correct: 0,
    why: "The RBI sets monetary policy and manages the rupee.",
  },
  {
    cat: "India", region: "IN", level: 2,
    q: "SEBI regulates:",
    options: ["Indian securities markets", "Indian railways", "Telecom tariffs", "Foreign visas"],
    correct: 0,
    why: "The Securities and Exchange Board of India protects investors and supervises markets.",
  },
  {
    cat: "India", region: "IN", level: 2,
    q: "A SIP is:",
    options: ["A fixed amount invested in a fund at regular intervals", "A one-time lump-sum purchase", "A type of bank loan", "A tax on share sales"],
    correct: 0,
    why: "Systematic Investment Plans average out your buying price over time.",
  },
  {
    cat: "India", region: "IN", level: 2,
    q: "TDS on a payment means:",
    options: ["Tax deducted at source before you receive it", "Total dividend share", "A trade settlement fee", "A deferred savings scheme"],
    correct: 0,
    why: "The payer withholds tax and deposits it with the government on your behalf.",
  },
  {
    cat: "India", region: "IN", level: 3,
    q: "Demat account holders hold shares in:",
    options: ["Electronic form", "Paper certificates only", "A bank locker", "A physical vault"],
    correct: 0,
    why: "Indian shares are held electronically through a depository.",
  },

  /* ---------------- united states ---------------- */
  {
    cat: "United States", region: "US", level: 1,
    q: "The S&P 500 tracks:",
    options: ["500 large US companies", "500 US banks only", "500 government bonds", "500 global currencies"],
    correct: 0,
    why: "It is the broad benchmark for large-cap US equities.",
  },
  {
    cat: "United States", region: "US", level: 1,
    q: "The Federal Reserve is:",
    options: ["The central bank of the United States", "A commercial bank", "A stock exchange", "A pension fund"],
    correct: 0,
    why: "The Fed sets US monetary policy and influences global liquidity.",
  },
  {
    cat: "United States", region: "US", level: 2,
    q: "A 401(k) is:",
    options: ["An employer-sponsored retirement account", "A type of mortgage", "A government bond", "A stock exchange rule"],
    correct: 0,
    why: "Contributions are often tax-advantaged and invested for retirement.",
  },
  {
    cat: "United States", region: "US", level: 2,
    q: "NASDAQ is known for:",
    options: ["A technology-heavy list of companies", "Only energy companies", "Government bonds", "Physical commodities"],
    correct: 0,
    why: "Many of the largest technology firms list on Nasdaq.",
  },
  {
    cat: "United States", region: "US", level: 2,
    q: "The SEC is responsible for:",
    options: ["Regulating US securities markets", "Setting income tax rates", "Running the postal service", "Insuring bank deposits"],
    correct: 0,
    why: "The Securities and Exchange Commission enforces market rules.",
  },
  {
    cat: "United States", region: "US", level: 3,
    q: "An IRA is designed for:",
    options: ["Individual retirement savings", "Short-term trading", "Company mergers", "Municipal borrowing"],
    correct: 0,
    why: "Individual Retirement Accounts offer tax advantages for long-term saving.",
  },

  /* ---------------- crypto ---------------- */
  {
    cat: "Crypto", region: "G", level: 1,
    q: "A cryptocurrency is:",
    options: ["A digital asset recorded on a blockchain", "A government-issued coin", "A type of ETF", "A bank deposit"],
    correct: 0,
    why: "Crypto assets live on distributed ledgers rather than a central issuer.",
  },
  {
    cat: "Crypto", region: "G", level: 2,
    q: "Bitcoin's total supply is:",
    options: ["Capped at 21 million coins", "Unlimited", "Fixed at 100 million coins", "Set by the Federal Reserve"],
    correct: 0,
    why: "The protocol caps issuance, which is why it is described as scarce.",
  },
  {
    cat: "Crypto", region: "G", level: 2,
    q: "Crypto is considered high risk mainly because of:",
    options: ["High volatility and uneven regulation", "Guaranteed negative returns", "Zero trading volume", "Government insurance"],
    correct: 0,
    why: "Prices can swing violently and investor protections vary by country.",
  },
  {
    cat: "Crypto", region: "G", level: 3,
    q: "A stablecoin aims to:",
    options: ["Hold a steady value against a reference asset", "Double in price every year", "Pay no fees", "Replace all stocks"],
    correct: 0,
    why: "Stablecoins peg to something like the dollar, though the peg can break.",
  },

  /* ---------------- behaviour ---------------- */
  {
    cat: "Behaviour", region: "G", level: 1,
    q: "Loss aversion means:",
    options: ["Losses hurt more than equal gains feel good", "Investors love losing", "Losses are always small", "Gains are taxed twice"],
    correct: 0,
    why: "The pain of a loss is felt roughly twice as strongly as the joy of a gain.",
  },
  {
    cat: "Behaviour", region: "G", level: 2,
    q: "Herding behaviour is:",
    options: ["Following the crowd into an investment", "Investing only in bonds", "Rebalancing every month", "Ignoring all news"],
    correct: 0,
    why: "Herding can inflate bubbles because people buy because others buy.",
  },
  {
    cat: "Behaviour", region: "G", level: 2,
    q: "FOMO most often causes investors to:",
    options: ["Buy after a price has already run up", "Sell at the bottom", "Hold cash forever", "Read financial statements"],
    correct: 0,
    why: "Fear of missing out pushes people in late, often at the worst price.",
  },
  {
    cat: "Behaviour", region: "G", level: 3,
    q: "A 'dead cat bounce' is:",
    options: ["A brief recovery in a falling market", "A guaranteed reversal", "A dividend cut", "A type of bond"],
    correct: 0,
    why: "The short bounce fools traders into thinking the decline is over.",
  },

  /* ---------------- economics ---------------- */
  {
    cat: "Economics", region: "G", level: 2,
    q: "A recession is commonly defined as:",
    options: ["Two consecutive quarters of falling GDP", "A single day of market losses", "A rise in inflation", "A budget surplus"],
    correct: 0,
    why: "It is a broad, sustained contraction in economic activity.",
  },
  {
    cat: "Economics", region: "G", level: 2,
    q: "GDP measures:",
    options: ["The value of goods and services produced", "The stock market's level", "Total government debt", "The money supply"],
    correct: 0,
    why: "Gross domestic product is the standard size measure of an economy.",
  },
  {
    cat: "Economics", region: "G", level: 3,
    q: "When interest rates rise, existing bond prices usually:",
    options: ["Fall", "Rise", "Stay exactly flat", "Become tax free"],
    correct: 0,
    why: "Newer bonds pay more, so older lower-yield bonds are worth less.",
  },
  {
    cat: "Economics", region: "G", level: 3,
    q: "When inflation runs hot, central banks typically:",
    options: ["Raise interest rates", "Cut interest rates", "Print more money", "Remove all taxes"],
    correct: 0,
    why: "Higher rates cool demand by making borrowing more expensive.",
  },
];

/* ------------------------------------------------------------------ */
/* procedural generators                                               */
/* ------------------------------------------------------------------ */

function rand(min, max) {
  return min + Math.random() * (max - min);
}
function int(min, max) {
  return Math.floor(rand(min, max + 1));
}
function round2(n) {
  return Math.round(n * 100) / 100;
}
function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function money(region, n) {
  const sym = region === "IN" ? "\u20b9" : "$";
  return sym + n.toLocaleString(region === "IN" ? "en-IN" : "en-US", { maximumFractionDigits: 2 });
}

/**
 * Build four distinct numeric options: the exact answer plus three plausible
 * misses. Values are formatted the same way so no option looks out of place.
 */
function numericOptions(correct, region, format = (n) => money(region, round2(n))) {
  const correctText = format(correct);
  const candidates = [correct * 0.75, correct * 1.25, correct * 1.5, correct * 0.5, correct + Math.abs(correct || 1) * 0.2];
  const seen = new Set([correctText]);
  const out = [correctText];
  for (const c of candidates) {
    if (out.length >= 4) break;
    const f = format(round2(c));
    if (!seen.has(f)) {
      seen.add(f);
      out.push(f);
    }
  }
  let bump = 1;
  while (out.length < 4) {
    const f = format(round2(correct + bump));
    if (!seen.has(f)) {
      seen.add(f);
      out.push(f);
    }
    bump++;
  }
  return shuffle(out).map((text) => ({ text, correct: text === correctText }));
}

const GENERATORS = [
  (region) => {
    const buy = round2(rand(region === "IN" ? 200 : 20, region === "IN" ? 1800 : 220));
    const pct = round2(rand(-22, 38));
    const sell = round2(buy * (1 + pct / 100));
    const exact = round2(((sell - buy) / buy) * 100);
    const opts = numericOptions(exact, region, (n) => `${round2(n)}%`);
    return {
      cat: "Maths", region, level: 2,
      q: `You buy a stock at ${money(region, buy)} and sell at ${money(region, sell)}. What is your percentage return?`,
      options: opts.map((o) => o.text),
      correct: opts.findIndex((o) => o.correct),
      why: `(${sell} - ${buy}) / ${buy} x 100 = ${exact}%.`,
    };
  },
  (region) => {
    const qty = int(10, 240);
    const buy = round2(rand(region === "IN" ? 80 : 8, region === "IN" ? 900 : 90));
    const sell = round2(buy * (1 + rand(0.02, 0.24)));
    const exact = round2((sell - buy) * qty);
    const opts = numericOptions(exact, region);
    return {
      cat: "Maths", region, level: 1,
      q: `You buy ${qty} shares at ${money(region, buy)} and sell all at ${money(region, sell)}. What is your profit before fees?`,
      options: opts.map((o) => o.text),
      correct: opts.findIndex((o) => o.correct),
      why: `(${sell} - ${buy}) x ${qty} = ${money(region, exact)}.`,
    };
  },
  (region) => {
    const p = round2(rand(region === "IN" ? 10000 : 1000, region === "IN" ? 200000 : 20000));
    const r = round2(rand(4, 14));
    const exact = round2(p * Math.pow(1 + r / 100, 2));
    const opts = numericOptions(exact, region);
    return {
      cat: "Maths", region, level: 2,
      q: `${money(region, p)} grows at ${r}% a year, compounded annually. What is it worth after 2 years?`,
      options: opts.map((o) => o.text),
      correct: opts.findIndex((o) => o.correct),
      why: `${p} x (1 + ${r}/100)^2 = ${money(region, exact)}.`,
    };
  },
  (region) => {
    const price = round2(rand(region === "IN" ? 300 : 30, region === "IN" ? 3200 : 320));
    const eps = round2(rand(5, 45));
    const exact = round2(price / eps);
    const opts = numericOptions(exact, region, (n) => `${round2(n)}x`);
    return {
      cat: "Maths", region, level: 2,
      q: `A share trades at ${money(region, price)} and earns ${money(region, eps)} per share. What is its P/E ratio?`,
      options: opts.map((o) => o.text),
      correct: opts.findIndex((o) => o.correct),
      why: `Price / EPS = ${price} / ${eps} = ${exact}x.`,
    };
  },
  (region) => {
    const portfolio = round2(rand(region === "IN" ? 50000 : 5000, region === "IN" ? 500000 : 50000));
    const weight = int(8, 42);
    const exact = round2((portfolio * weight) / 100);
    const opts = numericOptions(exact, region);
    return {
      cat: "Maths", region, level: 1,
      q: `Your portfolio is worth ${money(region, portfolio)}. You put ${weight}% into one stock. How much is invested?`,
      options: opts.map((o) => o.text),
      correct: opts.findIndex((o) => o.correct),
      why: `${weight}% x ${portfolio} = ${money(region, exact)}.`,
    };
  },
  (region) => {
    const price = round2(rand(region === "IN" ? 120 : 12, region === "IN" ? 2400 : 240));
    const div = round2(rand(1, region === "IN" ? 40 : 4));
    const exact = round2((div / price) * 100);
    const opts = numericOptions(exact, region, (n) => `${round2(n)}%`);
    return {
      cat: "Maths", region, level: 2,
      q: `A stock pays ${money(region, div)} per share in annual dividends and trades at ${money(region, price)}. What is the dividend yield?`,
      options: opts.map((o) => o.text),
      correct: opts.findIndex((o) => o.correct),
      why: `${div} / ${price} x 100 = ${exact}%.`,
    };
  },
  (region) => {
    const drop = int(15, 55);
    const exact = round2((1 / (1 - drop / 100) - 1) * 100);
    const opts = numericOptions(exact, region, (n) => `${round2(n)}%`);
    return {
      cat: "Maths", region, level: 3,
      q: `A stock falls ${drop}%. What percentage gain is needed just to get back to the original price?`,
      options: opts.map((o) => o.text),
      correct: opts.findIndex((o) => o.correct),
      why: `1 / (1 - ${drop}/100) - 1 = ${exact}%.`,
    };
  },
  (region) => {
    const rate = round2(rand(78, 92));
    const usd = int(50, 900);
    const exact = round2(usd * rate);
    const opts = numericOptions(exact, region, (n) => "\u20b9" + round2(n).toLocaleString("en-IN"));
    return {
      cat: "Maths", region: "IN", level: 2,
      q: `One US dollar is worth \u20b9${rate}. How many rupees is $${usd}?`,
      options: opts.map((o) => o.text),
      correct: opts.findIndex((o) => o.correct),
      why: `$${usd} x ${rate} = \u20b9${exact.toLocaleString("en-IN")}.`,
    };
  },
];

/* ------------------------------------------------------------------ */
/* assembly                                                            */
/* ------------------------------------------------------------------ */

function withShuffledOptions(question) {
  const tagged = question.options.map((text, i) => ({ text, correct: i === question.correct }));
  const shuffled = shuffle(tagged);
  return {
    ...question,
    options: shuffled.map((o) => o.text),
    correct: shuffled.findIndex((o) => o.correct),
  };
}

/**
 * Build one match's questions. Regional questions are guaranteed when the
 * bank has enough of them, then global curated questions, then fresh maths.
 */
export function buildMatchQuestions(region, count = 5) {
  const safeRegion = region === "US" ? "US" : "IN";
  const curatedCount = Math.max(2, count - 2);

  const regional = CURATED.filter((q) => q.region === safeRegion);
  const global = CURATED.filter((q) => q.region === "G");

  const picked = [];
  const regionalTarget = Math.min(regional.length, Math.max(2, Math.ceil(curatedCount / 2)));
  picked.push(...shuffle(regional).slice(0, regionalTarget));

  const rest = shuffle([
    ...regional.filter((q) => !picked.includes(q)),
    ...global,
  ]);
  while (picked.length < curatedCount && rest.length) picked.push(rest.shift());

  const generated = shuffle(GENERATORS)
    .slice(0, Math.max(0, count - picked.length))
    .map((fn) => fn(safeRegion));

  const seen = new Set();
  const final = [];
  for (const q of shuffle([...picked, ...generated])) {
    if (seen.has(q.q)) continue;
    seen.add(q.q);
    final.push(q);
    if (final.length === count) break;
  }

  // Extremely unlikely, but never send a short match.
  let guard = 0;
  while (final.length < count && guard < 40) {
    const extra = GENERATORS[guard % GENERATORS.length](safeRegion);
    guard++;
    if (seen.has(extra.q)) continue;
    seen.add(extra.q);
    final.push(extra);
  }

  return final.map((q, i) => ({ id: i + 1, ...withShuffledOptions(q) }));
}
