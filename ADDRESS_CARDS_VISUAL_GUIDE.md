# Customer Address Card Feature - Visual Guide

## 🎯 Feature Overview

```
ADMIN DASHBOARD
      ↓
   ┌─────────────────────────────────┐
   │   Admin Sidebar Menu            │
   │                                 │
   │   SYSTEM Section:               │
   │   • Sales Report                │
   │   • 📍 Address Cards  ← NEW!    │
   │   • Newsletter                  │
   │   • Order Alerts                │
   │   • Settings                    │
   └─────────────────────────────────┘
      ↓
ADDRESS CARDS PAGE
      ↓
   ┌─────────────────────────────────┐
   │  Search Customers               │
   │  [Search by name/email/phone]   │
   │                                 │
   │  Stats: 150 Total | 5 Showing   │
   │                                 │
   │  ┌──────────┬──────────┐        │
   │  │  CARD 1  │  CARD 2  │        │
   │  ├──────────┼──────────┤        │
   │  │  CARD 3  │  CARD 4  │        │
   │  └──────────┴──────────┘        │
   │                                 │
   │  Buttons:                       │
   │  🔄 Refresh | 🖨️ Print All     │
   │  📥 Export CSV                  │
   └─────────────────────────────────┘
      ↓
   Choose Action...
```

---

## 📋 Address Card Content

```
┌──────────────────────────────────┐
│  ADDRESS CARD LAYOUT             │
├──────────────────────────────────┤
│                                  │
│  Order Reference: ORD-2025-00125 │
│  ════════════════════════════════ │
│                                  │
│  👤 John Doe                     │
│                                  │
│  📞 Phone:   08012345678        │
│  📧 Email:   john@example.com    │
│  📍 Address: 123 Main Street,    │
│             Lagos, Nigeria       │
│  📅 Date:    January 15, 2026    │
│  💰 Amount:  ₦45,500             │
│                                  │
│  ┌──────────────────────────┐    │
│  │ 🖨️ Print | 📋 Copy      │    │
│  └──────────────────────────┘    │
│                                  │
└──────────────────────────────────┘
```

---

## 🔄 Data Flow

```
┌─────────────────┐
│  Admin Logs In  │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────┐
│ Navigate to Address Cards   │
│ (Sidebar or Sales Report)   │
└────────┬────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│ Page Loads & Authenticates       │
│ - Checks authToken               │
│ - Verifies admin role            │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│ Fetch Sales Data                 │
│ GET /api/sales                   │
│ (Bearer Token in Header)         │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│ Database Returns Orders          │
│ - Customer names                 │
│ - Emails & phones                │
│ - Shipping addresses             │
│ - Order info & dates             │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│ Render Address Cards             │
│ - Display in grid format         │
│ - Show stats                     │
│ - Enable search/filter           │
└────────┬─────────────────────────┘
         │
         ↓
     Admin Can...
     ├─ 🔍 Search customers
     ├─ 📋 Copy address
     ├─ 🖨️ Print card(s)
     └─ 📊 Export CSV
```

---

## 🎬 User Workflows

### Workflow 1: Print Single Address
```
[Address Cards Page]
        ↓
[Search for customer]
        ↓
[Click Card]
        ↓
[Click "Print" Button]
        ↓
[Print dialog opens]
        ↓
[Select printer]
        ↓
[Click Print]
        ↓
[Address label printed!]
```

### Workflow 2: Batch Print All
```
[Address Cards Page]
        ↓
[Click "Print All" Button]
        ↓
[Print dialog opens - multi-page]
        ↓
[Select printer]
        ↓
[Click Print]
        ↓
[All addresses print - page by page]
```

### Workflow 3: Copy & Paste
```
[Address Cards Page]
        ↓
[Find customer]
        ↓
[Click "Copy" Button]
        ↓
[Toast: "Address copied!"]
        ↓
[Paste in shipping system]
        ↓
[Address fills in automatically]
```

### Workflow 4: Export Data
```
[Address Cards Page]
        ↓
[Click "Export CSV" Button]
        ↓
[CSV file downloads]
        ↓
[Open in Excel/Google Sheets]
        ↓
[Use data for bulk processing]
```

---

## 🖨️ Print Layout

### Single Card Print
```
┌────────────────────────────────┐
│                                │
│   CUSTOMER ADDRESS CARD        │
│                                │
│   John Doe                     │
│   Order: ORD-2025-00125       │
│   ──────────────────────       │
│                                │
│   Phone:   08012345678        │
│   Email:   john@example.com    │
│   Address: 123 Main Street,    │
│            Lagos, Nigeria      │
│   Date:    January 15, 2026    │
│   Amount:  ₦45,500             │
│                                │
└────────────────────────────────┘
```

### Multiple Cards Print (Print All)
```
Page 1:
┌────────────┬────────────┐
│   Card 1   │   Card 2   │
├────────────┼────────────┤
│   Card 3   │   Card 4   │
└────────────┴────────────┘

Page 2:
┌────────────┬────────────┐
│   Card 5   │   Card 6   │
├────────────┼────────────┤
│   Card 7   │   Card 8   │
└────────────┴────────────┘

... and so on
```

---

## 🔐 Security Flow

```
User Access Request
        ↓
┌──────────────────────┐
│ Check authToken?     │
│ (in localStorage)    │
└────┬─────────────────┘
     │
  No ↓ → Redirect to /login.html
     │
  Yes ↓
┌──────────────────────┐
│ Check authRole?      │
│ (Must be 'admin')    │
└────┬─────────────────┘
     │
  No ↓ → Redirect to /login.html
     │
  Yes ↓
┌──────────────────────┐
│ Load Address Cards   │
│ Access Granted ✅    │
└──────────────────────┘
```

---

## 📱 Responsive Grid

### Desktop (3+ columns)
```
┌──────────┬──────────┬──────────┐
│ Card 1   │ Card 2   │ Card 3   │
├──────────┼──────────┼──────────┤
│ Card 4   │ Card 5   │ Card 6   │
└──────────┴──────────┴──────────┘
```

### Tablet (2 columns)
```
┌──────────┬──────────┐
│ Card 1   │ Card 2   │
├──────────┼──────────┤
│ Card 3   │ Card 4   │
└──────────┴──────────┘
```

### Mobile (1 column)
```
┌──────────┐
│ Card 1   │
├──────────┤
│ Card 2   │
├──────────┤
│ Card 3   │
└──────────┘
```

---

## 🎯 Feature Capabilities

```
ADDRESS CARDS PAGE
│
├─ 🔍 SEARCH & FILTER
│  ├─ By customer name
│  ├─ By email address
│  └─ By phone number
│
├─ 📊 STATISTICS
│  ├─ Total orders count
│  └─ Currently showing count
│
├─ 🖨️ PRINTING
│  ├─ Print single card
│  ├─ Print all cards (multi-page)
│  └─ Optimized for thermal & regular printers
│
├─ 📋 DATA MANAGEMENT
│  ├─ Copy address to clipboard
│  ├─ Export all as CSV
│  └─ CSV compatible with Excel
│
├─ 🎨 USER EXPERIENCE
│  ├─ Professional card layout
│  ├─ Responsive design
│  ├─ Loading states
│  ├─ Empty state messaging
│  ├─ Toast notifications
│  └─ Error handling
│
└─ 🔒 SECURITY
   ├─ Admin authentication
   ├─ Token verification
   └─ Secure API calls
```

---

## 📈 Integration Points

```
ADMIN DASHBOARD
├─ Sidebar Menu
│  └─ "Address Cards" Link → admin-address-card.html
│
└─ Navigation System
   └─ Routes to /admin-address-card.html

SALES REPORT PAGE
├─ "View Address Cards" Button → admin-address-card.html
│
└─ Quick access from orders list

EXISTING APIs
├─ /api/sales (GET)
│  └─ Fetches all customer orders
│     └─ Data: name, email, phone, address, etc.
│
└─ Authentication (Bearer Token)
   └─ Existing JWT system reused
```

---

## ✨ Feature Status

```
✅ Page Created: admin-address-card.html
✅ Menu Updated: admin.html
✅ Link Added: admin_sales.html
✅ Search Implemented
✅ Print Functionality
✅ CSV Export
✅ Copy to Clipboard
✅ Responsive Design
✅ Authentication
✅ Print Styles
✅ Error Handling
✅ Documentation
```

---

**All systems operational and ready for production use!** 🚀
