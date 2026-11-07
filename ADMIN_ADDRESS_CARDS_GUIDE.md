# Customer Address Cards - Admin Feature

## Overview
Admins can now view and print customer shipping addresses from all completed orders. This makes it easy to prepare shipments and manage deliveries.

## Features

### 1. **View Address Cards**
- Access from: Admin Dashboard → Address Cards (in sidebar)
- Or: Sales Report → View Address Cards button
- Displays all customer addresses in an easy-to-read card format
- Shows:
  - Customer name
  - Phone number
  - Email address
  - Shipping address
  - Order date
  - Order amount
  - Order reference number

### 2. **Search & Filter**
- Search by customer name, email, or phone number
- Real-time filtering as you type
- Shows total orders and filtered results count

### 3. **Print Options**

#### Print Individual Card
- Click "Print" button on any card
- Opens print dialog with formatted address
- Perfect for generating shipping labels

#### Print All Cards
- Click "Print All" button at the top
- Prints all address cards on multiple pages
- Each card on separate page (page-break after)
- Professional formatting with borders

#### Print-Friendly Styles
- Special CSS for printing
- Cards display as 2x2 grid when printed
- Removes buttons and extra controls
- Optimized for thermal printers

### 4. **Copy Address**
- Click "Copy" button on any card
- Copies address to clipboard in formatted text:
  ```
  Customer Name
  Phone Number
  Email Address
  Full Address
  ```
- Quick access for pasting into other systems

### 5. **Export Data**
- Click "Download CSV" button
- Exports all orders with customer details
- Filename: `address-cards-YYYY-MM-DD.csv`
- Includes: Reference, Name, Email, Phone, Address, Amount, Date
- Can be imported into Excel or other tools

## How to Use

### Step 1: Navigate to Address Cards
From Admin Dashboard:
1. Look for **"Address Cards"** in the sidebar under System section
2. Click on it

Or from Sales Report:
1. Go to Sales Report page
2. Click **"View Address Cards"** button

### Step 2: Find Customer Address
- Use the search bar to find a specific customer
- Or scroll through all addresses
- Stats show total orders and current filtered count

### Step 3: Take Action
Choose one of these options:

**For Individual Address:**
- Click **"Print"** to print that customer's address card
- Click **"Copy"** to copy address to clipboard

**For All Addresses:**
- Click **"Print All"** to print all visible addresses
- Click **"Export CSV"** to download as spreadsheet

### Step 4: Print or Save
- If printing: Choose printer, page layout, and print
- If exporting: Open CSV in Excel and customize as needed

## Technical Details

### Data Retrieved
- All sales records from database
- Fields: name, email, phone, address, reference, amount, date

### Security
- Admin authentication required
- Bearer token verification
- Same security as existing sales page

### Performance
- Loads all orders on page load
- Filtering happens client-side (fast)
- Supports thousands of orders

### Print Formatting
- Professional card design with gold (#d4af37) accents
- Clear typography
- Print-optimized CSS
- Removes interactive elements when printing

## API Endpoint Used
```
GET /api/sales
Headers: Authorization: Bearer {authToken}
```

## File Location
- Page: `/admin-address-card.html`
- Access: Admin menu or direct URL

## Benefits

✅ **Quick Shipping Preparation** - Print addresses instantly
✅ **No Manual Entry** - Prevents transcription errors
✅ **Bulk Export** - Download all orders as CSV
✅ **Mobile Friendly** - Responsive design works on tablets
✅ **Search Capability** - Quickly find specific customers
✅ **Printing Ready** - Optimized for thermal and standard printers

## Tips

1. **For Thermal Printers**: Print individual cards one at a time
2. **For Regular Printers**: Use "Print All" to batch print multiple addresses
3. **For Records**: Export to CSV for backup or analysis
4. **For Bulk Orders**: Use export feature to process in bulk

---

**Version**: 1.0
**Added**: January 2026
**Status**: Production Ready
