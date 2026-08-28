-- Phase 2 Memberships: Freeze and Multi-branch

ALTER TABLE customer_memberships 
ADD COLUMN frozen_until DATE,
ADD COLUMN freeze_reason VARCHAR(255);

ALTER TABLE membership_plans
ADD COLUMN is_multi_branch BOOLEAN DEFAULT true;
