# Phase 3: Code Quality & Refactoring

## 📊 Complexity Analysis

### Current Issues Identified

| Function | Complexity | Lines | Issues | Priority |
|----------|-----------|-------|--------|----------|
| `/api/login` | 54 | 98 | Duplicated admin/manager logic, nested try-catch | 🔴 HIGH |
| `/api/paystack/webhook` | 58 | 145 | Email logic mixed with payment logic, complex branching | 🔴 HIGH |
| `/api/messages` POST | 42 | 87 | Recipient lookup, recipient check, message creation all mixed | 🟡 MEDIUM |
| `/api/otp/request` | 38 | 76 | Session creation and item processing intertwined | 🟡 MEDIUM |
| Admin operations (orders, products, users) | 35+ | 60+ each | Repetitive CRUD patterns | 🟡 MEDIUM |

---

## 🎯 Refactoring Strategy

### Phase 3.1: Login Endpoint Refactoring (Critical)

**Goal**: Reduce complexity from 54 to <20
**Method**: Extract helper functions

**Current Issues**:
```
❌ Role-based logic duplicated (admin & manager have same pattern)
❌ Nested try-catch blocks (hard to debug)
❌ DB fallback mixed with env var logic
❌ Complex email transformation logic
```

**Refactored Structure**:
```
✅ Single validateRoleCredentials() function
✅ Reusable findUserByEmail() helper
✅ Separate envUserValidation() function
✅ Clear error handling at each step
```

**Files to Create**:
- `services/authService.js` - Authentication helpers

---

### Phase 3.2: Webhook Refactoring (Critical)

**Goal**: Reduce complexity from 58 to <25
**Method**: Extract payment processing, email sending, inventory update

**Current Issues**:
```
❌ Stock update logic mixed with payment confirmation
❌ Email functions intertwined with business logic
❌ Error handling not consistent
```

**Refactored Structure**:
```
✅ processPayment() function
✅ updateInventory() function
✅ sendPaymentEmails() function (calls confirmation + status)
✅ Webhook becomes orchestrator only
```

**Files to Create**:
- `services/paymentService.js` - Payment processing
- `services/inventoryService.js` - Stock management

---

### Phase 3.3: Message Endpoint Refactoring (Medium)

**Goal**: Reduce complexity from 42 to <18
**Method**: Extract validation, recipient lookup, message creation

**Files to Create**:
- `services/messageService.js` - Message operations

---

### Phase 3.4: Accessibility & Error Handling (Medium)

**Issues**:
```
❌ Inconsistent error response format
❌ No ARIA labels on forms
❌ Low contrast text in some UI elements
```

**Fixes**:
- Standardize error response: `{ success, message, code, details }`
- Add ARIA labels to all form inputs
- Fix contrast ratios to WCAG AA (4.5:1)

---

## 📋 Detailed Refactoring Plan

### Step 1: Create Auth Service (15 mins)

**File**: `services/authService.js`

```javascript
// Helper: Validate credentials against env variables
async function validateEnvCredentials(email, password, envUser, envHash, envPlain)

// Helper: Find user by email with multiple fallbacks
async function findUserByEmail(email)

// Helper: Validate user has required role and password
async function validateUserCredentials(dbUser, password, requiredRole)

// Main: Authenticate by role
async function authenticateByRole(email, password, role)
```

**Benefits**:
- Reusable across multiple endpoints
- Easier to unit test
- Centralized auth logic

---

### Step 2: Create Payment Service (20 mins)

**File**: `services/paymentService.js`

```javascript
// Process payment confirmation
async function processPaymentConfirmation(reference, session, amountPaid)

// Update product inventory
async function updateProductInventory(items)

// Get order details for email
function formatOrderForEmail(session, reference, amountPaid)

// Handle payment callback
async function handlePaymentCallback(event, signature, isValid)
```

**Benefits**:
- Reusable for other payment methods
- Easier to test payment logic
- Clear separation of concerns

---

### Step 3: Create Message Service (10 mins)

**File**: `services/messageService.js`

```javascript
// Validate recipient exists and get details
async function validateRecipient(recipientId, userId)

// Create message with proper nesting
async function createMessage(messageData, userId)

// Get user's inbox/sent
async function getUserMessages(userId, type)
```

---

### Step 4: Update Error Handling (10 mins)

**File**: `utils/errorHandler.js`

```javascript
// Standardized error response
function errorResponse(res, statusCode, message, code, details)

// Standardized success response
function successResponse(res, data)

// Common error codes
const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  SERVER_ERROR: 'SERVER_ERROR'
}
```

---

### Step 5: Add Accessibility Fixes (15 mins)

**Files to Update**:
- `public/index.html` - Add ARIA labels
- `public/style.css` - Fix contrast ratios
- `public/admin-panel.html` - Add semantic HTML
- `public/manager-panel.html` - Add semantic HTML

**Changes**:
- Add `aria-label` to all form inputs
- Add `aria-describedby` for help text
- Fix color contrast (target WCAG AA)
- Add `role="alert"` to error messages
- Add `alt` text to all images

---

## 🚀 Implementation Steps

### Step 1: Create Services Directory
```bash
mkdir services
mkdir utils
```

### Step 2: Create Auth Service
```bash
touch services/authService.js
```

### Step 3: Create Payment Service
```bash
touch services/paymentService.js
```

### Step 4: Create Message Service
```bash
touch services/messageService.js
```

### Step 5: Create Error Handler Utility
```bash
touch utils/errorHandler.js
```

### Step 6: Update server.js to use services

### Step 7: Update HTML files for accessibility

---

## 📈 Expected Improvements

### Code Metrics
| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Avg Function Complexity | 42 | 18 | <20 ✅ |
| Max Function Complexity | 58 | 22 | <25 ✅ |
| Duplicated Code | 12% | 2% | <5% ✅ |
| Test Coverage | 0% | 45% | >80% |

### Maintainability
- ✅ Easier to test (services can be mocked)
- ✅ Easier to debug (clear separation)
- ✅ Easier to extend (add new payment methods, auth types)
- ✅ Better error handling (consistent format)
- ✅ Better accessibility (WCAG AA compliant)

### Security
- ✅ Centralized auth logic = easier to audit
- ✅ Consistent validation across endpoints
- ✅ Better error messages (don't leak info)
- ✅ Easier to implement new security features

---

## ⏱️ Time Estimate

| Task | Time |
|------|------|
| Create Auth Service | 15 mins |
| Create Payment Service | 20 mins |
| Create Message Service | 10 mins |
| Create Error Handler | 10 mins |
| Update server.js to use services | 30 mins |
| Update HTML for accessibility | 20 mins |
| Testing all endpoints | 30 mins |
| **TOTAL** | **~2.5 hours** |

---

## ✅ Pre-Refactoring Checklist

- [ ] All Phase 2 features working (search, wishlist, reviews)
- [ ] All tests passing
- [ ] Database indexes created
- [ ] Email notifications integrated
- [ ] Git branch created for refactoring
- [ ] Backup of current server.js

---

## 📝 Refactoring Rules

1. **Don't break existing functionality**
   - All endpoints should work exactly the same after refactoring
   - All response formats should remain identical
   - All error messages should be similar

2. **Maintain backward compatibility**
   - API responses unchanged
   - Database structure unchanged
   - No new dependencies

3. **Test as you go**
   - Test each endpoint after refactoring
   - Run full test suite after each major change
   - Get user approval before moving to next phase

4. **Document changes**
   - Comments explaining new services
   - Update README with service locations
   - Document utility functions

---

## 🎯 Success Criteria

✅ **Phase 3 Complete When**:
- All services extracted and working
- Error handling standardized
- All 40+ tests passing
- Accessibility audit passes (WCAG AA)
- Code review approved
- No regression in functionality

---

## 📚 Reference

### Service Architecture
```
server.js (routes)
    ↓
services/ (business logic)
    ├─ authService.js
    ├─ paymentService.js
    ├─ messageService.js
    └─ inventoryService.js
    ↓
models/ (data layer)
    ├─ User.js
    ├─ Product.js
    ├─ Message.js
    └─ Sale.js
    ↓
utils/ (helpers)
    ├─ errorHandler.js
    └─ validators.js
```

---

## 🔗 Next Steps After Refactoring

1. **Phase 4: Testing & Documentation**
   - Add Jest/Mocha tests
   - Add API documentation (Swagger)
   - Add JSDoc comments

2. **Phase 5: Performance Optimization**
   - Add caching (Redis)
   - Add database query optimization
   - Add response compression

3. **Phase 6: Advanced Features**
   - Real-time notifications (WebSocket)
   - Analytics dashboard
   - Recommendation engine

---

**Status**: Phase 3 Planning ✅ | Ready to Implement  
**Target Date**: December 24, 2025  
**Estimated Duration**: 2.5 hours
