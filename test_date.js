try {
  let inv = { invoice_date: undefined };
  console.log(new Date(new Date(inv.invoice_date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString());
} catch(e) {
  console.log("Error:", e.message);
}
