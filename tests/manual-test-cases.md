# Manual Testing Checklist for Salon Billing System

## Test Environment Setup
- [ ] Database is seeded with test data
- [ ] All services are running (Next.js app, database)
- [ ] Test customer accounts are available
- [ ] Test products, services, and coupons are configured

## 1. Customer Management Tests

### Test Case 1.1: Existing Customer Search
**Steps:**
1. Navigate to `/new-sale`
2. Use search bar to find "Sarah Johnson"
3. Verify customer profile loads with correct details
4. Check wallet balance display (should show loyalty points)

**Expected Result:**
- Customer appears in search results
- Profile shows: name, phone, email, loyalty points, visit history
- Wallet balance is visible and accurate

### Test Case 1.2: New Customer Creation
**Steps:**
1. Click "New Customer" button
2. Fill required fields: Full Name, Phone Number
3. Fill optional fields: Email, Gender, Date of Birth
4. Submit form
5. Verify customer is created and selectable

**Expected Result:**
- Form validates required fields
- New customer is saved to database
- Customer appears in selection list
- Can proceed to service selection

## 2. Service and Product Selection Tests

### Test Case 2.1: Add Services to Cart
**Steps:**
1. Select a customer
2. Navigate to Services tab
3. Add "Premium Hair Cut" service
4. Verify service appears in cart with correct price
5. Add multiple quantities of same service
6. Verify quantity and total price calculation

**Expected Result:**
- Services added to cart correctly
- Prices calculated accurately
- Quantity controls work properly
- Cart total updates in real-time

### Test Case 2.2: Add Products to Cart
**Steps:**
1. Navigate to Products tab
2. Add "Hair Serum" product
3. Verify stock validation (cannot exceed available stock)
4. Add multiple products
5. Check cart summary

**Expected Result:**
- Products added with stock validation
- Cannot add more than available stock
- Cart shows both services and products
- Totals calculated correctly

### Test Case 2.3: Staff Assignment
**Steps:**
1. Scroll to Staff Selection section
2. Select a staff member (required)
3. Optionally select a manager
4. Verify selections are highlighted
5. Try to proceed without staff selection

**Expected Result:**
- Staff selection is mandatory
- Cannot proceed to checkout without staff
- Selected staff/manager are clearly indicated
- Validation error shown if staff not selected

## 3. Discount and Coupon Tests

### Test Case 3.1: Coupon Application
**Steps:**
1. Add items to cart (total > ₹500)
2. Enter coupon code "WELCOME10"
3. Click "Apply Coupon"
4. Verify discount is applied
5. Check total calculation
6. Try invalid coupon code

**Expected Result:**
- Valid coupon applies 10% discount
- Maximum discount cap is respected
- Invalid coupons show error message
- Total recalculates correctly

### Test Case 3.2: Manual Discount
**Steps:**
1. Add items to cart
2. Apply manual discount (e.g., 15%)
3. Verify discount calculation
4. Test with both coupon and manual discount
5. Check final total

**Expected Result:**
- Manual discount applies correctly
- Can combine with coupon discounts
- Total reflects all discounts
- Discount breakdown is clear

### Test Case 3.3: Loyalty Points Usage
**Steps:**
1. Select customer with loyalty points
2. Navigate to checkout
3. Enable "Use Loyalty Points" toggle
4. Set points to use (within available balance)
5. Verify amount due updates

**Expected Result:**
- Toggle enables points usage
- Cannot use more points than available
- Amount due reduces correctly
- Points conversion rate is accurate (1 point = ₹1)

## 4. Checkout Process Tests

### Test Case 4.1: Payment Method Selection
**Steps:**
1. Navigate to checkout screen
2. Review order summary
3. Select different payment methods (Cash, Card, UPI, Wallet)
4. Verify payment method is highlighted
5. Complete transaction

**Expected Result:**
- All payment methods are selectable
- Selected method is clearly indicated
- Transaction processes successfully
- Payment method is recorded

### Test Case 4.2: Order Summary Validation
**Steps:**
1. Review checkout summary
2. Verify all items are listed correctly
3. Check subtotal calculation
4. Verify discount applications
5. Confirm GST calculation (18%)
6. Validate final total

**Expected Result:**
- All cart items appear in summary
- Calculations are mathematically correct
- GST is calculated on taxable amount
- Final total matches expectations

## 5. Invoice Generation Tests

### Test Case 5.1: Invoice Creation
**Steps:**
1. Complete a transaction
2. Verify invoice is generated automatically
3. Check invoice contains all required details
4. Verify invoice number is unique
5. Check customer and business information

**Expected Result:**
- Invoice generates immediately after payment
- Contains all transaction details
- Invoice number follows format (INV-YYYY-XXXXXX)
- Customer and business info is complete

### Test Case 5.2: Invoice Sharing
**Steps:**
1. Generate an invoice
2. Test WhatsApp sharing functionality
3. Verify message format and content
4. Check if customer phone number is used
5. Test print functionality

**Expected Result:**
- WhatsApp sharing opens with pre-filled message
- Message contains invoice details
- Customer phone number is auto-filled
- Print option works correctly

## 6. Data Integration Tests

### Test Case 6.1: Management Section Integration
**Steps:**
1. Navigate to `/manage/products`
2. Add a new product
3. Go to `/new-sale` and verify product appears
4. Repeat for services, coupons, categories
5. Test data consistency

**Expected Result:**
- New products/services appear in sale interface
- Coupons are available for application
- Categories filter products correctly
- Data is consistent across sections

## 7. Error Handling Tests

### Test Case 7.1: Network Error Handling
**Steps:**
1. Simulate network disconnection
2. Try to create customer
3. Try to complete transaction
4. Verify error messages
5. Test retry functionality

**Expected Result:**
- Appropriate error messages shown
- User can retry failed operations
- Data is not lost during errors
- Graceful degradation

### Test Case 7.2: Validation Error Handling
**Steps:**
1. Try to proceed without selecting customer
2. Try to checkout with empty cart
3. Enter invalid coupon codes
4. Try to use more loyalty points than available
5. Test form validation

**Expected Result:**
- Clear validation error messages
- User cannot proceed with invalid data
- Form highlights problematic fields
- Error messages are user-friendly

## Performance Tests

### Test Case 8.1: Load Time Tests
**Steps:**
1. Measure page load times
2. Test with large customer database
3. Test cart with many items
4. Measure checkout completion time

**Expected Result:**
- Pages load within 2 seconds
- Search results appear quickly
- Cart updates are instantaneous
- Checkout completes within 5 seconds

## Reporting Template

For each failed test case, document:

**Issue:** Brief description of the problem
**Steps to Reproduce:** 
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:** What should happen
**Actual Behavior:** What actually happened
**Severity:** Critical/High/Medium/Low
**Screenshots:** If applicable
**Browser/Device:** Testing environment details
