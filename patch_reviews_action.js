const fs = require('fs');
let code = fs.readFileSync('app/actions/reviews.ts', 'utf8');

const additional = `
export async function ensureReviewsTable(sql: any) {
  await sql\`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      tenant_id VARCHAR(100) NOT NULL,
      customer_id INTEGER,
      booking_id INTEGER,
      rating INTEGER NOT NULL,
      review_text TEXT,
      platform VARCHAR(50) DEFAULT 'Direct',
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  \`
}

export async function submitReviewPublic(tenantId: string, bookingId: number, rating: number, reviewText: string = '') {
  // We can't use withTenantAuth because this is from the public invoice page!
  // So we import neon directly.
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL!);
  
  try {
    await ensureReviewsTable(sql);
    
    // Get customer_id from booking if possible
    let customerId = null;
    try {
      const bookings = await sql\`SELECT customer_id FROM bookings WHERE id = \${bookingId} AND tenant_id = \${tenantId}\`;
      if (bookings.length > 0) {
        customerId = bookings[0].customer_id;
      }
    } catch(e) {}
    
    // Insert
    await sql\`
      INSERT INTO reviews (tenant_id, customer_id, booking_id, rating, review_text, platform, status)
      VALUES (\${tenantId}, \${customerId}, \${bookingId}, \${rating}, \${reviewText}, 'Direct', 'approved')
    \`;
    return { success: true };
  } catch(e: any) {
    console.error("Failed to submit review:", e);
    return { success: false, message: e.message };
  }
}
`;

if (!code.includes('submitReviewPublic')) {
  // inject ensureReviewsTable in getReviews
  code = code.replace(
    /try \{\n      const reviews = await sql\`/,
    `try {
      await ensureReviewsTable(sql);
      const reviews = await sql\``
  );

  code += '\n' + additional;
  fs.writeFileSync('app/actions/reviews.ts', code);
}
