import { getLoyaltyTransactions } from "./app/actions/loyalty.ts";

async function run() {
  const data = await getLoyaltyTransactions({ limit: 10 }, "1");
  console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);
