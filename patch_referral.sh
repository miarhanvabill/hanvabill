sed -i '' -e '/return {/i\
      // -------------------------------------------------------------\
      // REFERRAL REWARD (First Checkout Logic)\
      // -------------------------------------------------------------\
      try {\
        const [refCheck] = await sql\`\
          SELECT c.referred_by_customer_id,\
                 (SELECT COUNT(*) FROM invoices i WHERE i.customer_id = c.id AND i.tenant_id = \${tenantId}) as invoice_count\
          FROM customers c \
          WHERE c.id = \${customerId} AND c.tenant_id = \${tenantId}\
        \`\
        if (refCheck \&\& refCheck.referred_by_customer_id \&\& Number(refCheck.invoice_count) === 1) {\
          const { processReferralReward } = await import("@/app/actions/loyalty")\
          await processReferralReward(customerId, refCheck.referred_by_customer_id, tenantId)\
        }\
      } catch (err) {\
        console.error("Failed to process referral reward:", err)\
      }\
\
' app/actions/checkout.ts
