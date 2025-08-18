-- Insert sample membership plans if they don't exist
INSERT INTO membership_plans (name, description, price, duration_months, benefits, discount_percentage, status)
VALUES 
  (
    'Gold Membership',
    'Premium membership with exclusive benefits and priority access',
    299.00,
    12,
    '["20% discount on all services", "Priority booking", "Free monthly facial", "Complimentary products", "Birthday special treatment"]',
    20.0,
    'active'
  ),
  (
    'Silver Membership',
    'Great value membership for regular customers with excellent benefits',
    199.00,
    12,
    '["15% discount on all services", "Priority booking", "Birthday special", "Member-only promotions"]',
    15.0,
    'active'
  ),
  (
    'Bronze Membership',
    'Entry-level membership with basic benefits for occasional visitors',
    99.00,
    6,
    '["10% discount on all services", "Member-only promotions", "Seasonal offers"]',
    10.0,
    'active'
  ),
  (
    'Platinum Membership',
    'Ultimate luxury membership with all premium benefits and VIP treatment',
    499.00,
    12,
    '["25% discount on all services", "VIP priority booking", "Free monthly premium treatment", "Complimentary luxury products", "Personal beauty consultant", "Exclusive events access"]',
    25.0,
    'active'
  )
ON CONFLICT (name) DO NOTHING;
