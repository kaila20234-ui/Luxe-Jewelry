# Manager-Admin Communication System & Configuration Guide

## 📋 Overview

A comprehensive internal messaging system has been implemented to enable secure communication between managers and admins, along with configuration and support features.

---

## 🎯 New Features Added

### 1. **Internal Messaging System**
- **Location**: `public/messages.html`
- **Access**: Direct URL or through dashboard menu
- **Features**:
  - Send messages between manager ↔ admin only
  - Inbox and Sent tabs
  - Compose new messages with priority levels
  - Mark messages as read/unread
  - Archive and delete functionality
  - Unread message counter badge
  - Auto-refresh every 30 seconds
  - Professional golden-themed UI

**Manager Dashboard Integration**:
- Added "Messages" tab to admin_complain.html
- Added "Settings" tab for password management
- Direct link to full messaging interface

**Admin Dashboard Integration**:
- Added "Messages" menu item to admin.html
- Message preview showing recent inbox
- Direct link to full messaging dashboard

### 2. **System Configuration Pages**

#### Setup Configuration (`setup.html`)
- **Purpose**: Guided setup experience for new installations
- **Features**:
  - Step-by-step configuration checklist
  - Quick access to all major features
  - Support and troubleshooting guide
  - Status indicators (Pending/Complete)
  - Links to all system modules
- **Access**: Via home page or `/setup.html`

#### Admin Initialization (`init-admin.html`)
- **Purpose**: Create the first admin account
- **Features**:
  - Form to create initial admin user
  - Password validation (min 6 characters)
  - Password confirmation
  - Success/error messaging
  - Auto-redirect to login after creation
  - Can only create if no admin exists

### 3. **Staff Login System**
- **Location**: `public/login.html`
- **Roles**: Manager and Admin
- **Features**:
  - Role selection dropdown
  - Unified authentication
  - Token-based session management
  - Persistent login across pages
  - Mandatory authentication for protected pages

---

## 🔧 Backend API Endpoints

### Message Management
- `POST /api/messages` - Send a message
- `GET /api/messages/inbox` - Get received messages
- `GET /api/messages/sent` - Get sent messages
- `GET /api/messages/conversation/:conversationId` - Get conversation thread
- `PUT /api/messages/:id/read` - Mark message as read
- `PUT /api/messages/:id/archive` - Archive a message
- `DELETE /api/messages/:id` - Delete a message
- `GET /api/messages/unread/count` - Get unread message count

### User Management
- `GET /api/users/staff` - List all managers and admins
- `POST /api/admin/users` - Create a new staff user
- `GET /api/admin/users` - List staff users
- `DELETE /api/admin/users/:id` - Delete a staff user

### System Initialization
- `POST /api/init/admin` - Create initial admin account (public endpoint)

---

## 📋 Database Schema

### Message Model
```javascript
{
  _id: ObjectId,
  senderId: ObjectId,              // Reference to User
  senderRole: "manager" | "admin",
  senderName: String,
  senderEmail: String,
  recipientId: ObjectId,           // Reference to User
  recipientRole: "manager" | "admin",
  subject: String,
  body: String,
  isRead: Boolean,
  readAt: Date,
  priority: "low" | "normal" | "high",
  conversationId: String,          // For grouping messages
  parentMessageId: ObjectId,       // For message threads
  isArchived: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚀 Getting Started

### Step 1: Initialize Admin Account
1. Navigate to `http://localhost:5000/init-admin.html`
2. Fill in the form with admin details:
   - Full Name (e.g., "System Administrator")
   - Email Address
   - Strong Password (min. 6 characters)
   - Confirm Password
3. Click "Create Admin Account"
4. You'll be redirected to login page

### Step 2: Login to Dashboard
1. Go to `http://localhost:5000/login.html`
2. Select "Admin" role
3. Enter your admin credentials
4. Click "Sign in"
5. Access the main dashboard

### Step 3: Create Manager Accounts
1. In admin dashboard, go to "Users" section
2. Click "Add New User"
3. Fill in manager details
4. Select "Manager" role
5. Create the user

### Step 4: Access Messaging System
1. Click "Messages" in the sidebar (admin) or tab (manager)
2. Or go directly to `http://localhost:5000/messages.html`
3. Click "+ Compose New Message"
4. Select recipient from opposite role
5. Write subject and message
6. Choose priority level
7. Send!

---

## 🔐 Security Features

✅ **JWT Authentication**
- Tokens stored in localStorage
- 6-hour expiration by default
- Signature verification on backend

✅ **Role-Based Access Control**
- Separate roles for admin and manager
- Protected endpoints verify role
- Cross-role communication only

✅ **User Verification**
- Users must exist in database
- Email and username fallback lookup
- Role-based filtering

✅ **Mandatory Authentication**
- All protected pages check auth token
- Auto-redirect to login if unauthorized
- Session persistence across pages

---

## 📱 Pages & Navigation

### Customer-Facing
- `index.html` - Home page with product showcase
- `customer-login.html` - Customer login
- `customer-dashboard.html` - Customer account & orders
- `complain.html` - Customer complaint form

### Staff-Facing
- `login.html` - Staff login (admin/manager)
- `admin.html` - Admin dashboard
- `admin_complain.html` - Manager dashboard
- `messages.html` - Internal messaging
- `setup.html` - System configuration guide
- `init-admin.html` - Admin account creation

### Navigation
- `quick-links.html` - Site map and quick navigation
- `payment-success.html` - Payment confirmation page

---

## 🎨 UI/UX Features

### Golden Gradient Theme
- Primary color: `#d4af37` (Gold)
- Secondary: `#b8941e` (Dark Gold)
- Professional, luxury jewelry brand aesthetic

### Responsive Design
- Mobile-friendly layouts
- Tablet optimized
- Desktop full-featured experience

### User Feedback
- Toast notifications for actions
- Loading states and spinners
- Success/error messages
- Unread count badges

---

## 🔧 Configuration & Troubleshooting

### Environment Variables Required
```
MONGO_URI=mongodb://127.0.0.1:27017/luxe_jewelry
JWT_SECRET=your_secret_key_here
ADMIN_USER=manager
ADMIN_PASS_HASH=bcrypt_hashed_password
```

### Common Issues & Solutions

**Issue: "Access Denied" on messaging page**
- Solution: Ensure you're logged in with admin or manager role
- Check localStorage for authToken and authRole
- Clear cache and login again

**Issue: No recipients showing in compose form**
- Solution: Ensure at least one user of opposite role exists
- Admin composing? Must have manager accounts created
- Manager composing? Must have admin account created

**Issue: Messages not sending**
- Solution: Check browser console for errors
- Verify both sender and recipient exist in database
- Ensure JWT token is valid
- Check API is running on port 5000

**Issue: Can't create admin account**
- Solution: `/api/init/admin` is public but only works if no admin exists
- Create via database directly if needed
- Use admin DB user creation endpoint instead

---

## 📊 Feature Checklist

### Messaging System
- ✅ Send messages between admin/manager
- ✅ Inbox and Sent views
- ✅ Mark messages as read
- ✅ Archive messages
- ✅ Delete messages
- ✅ Priority levels
- ✅ Conversation threads
- ✅ Unread count indicator
- ✅ Auto-refresh functionality

### Configuration
- ✅ Admin account initialization
- ✅ Setup configuration page
- ✅ System status dashboard
- ✅ Checklist-based onboarding
- ✅ Support & troubleshooting guide

### User Management
- ✅ Create staff users (manager/admin)
- ✅ List staff users
- ✅ Delete staff users
- ✅ Role-based access control
- ✅ Password management

### Integration
- ✅ Manager dashboard messaging
- ✅ Admin dashboard messaging
- ✅ Complaint reply system
- ✅ Settings/profile management

---

## 🎯 Next Steps (Optional Enhancements)

1. **Real-time Notifications**
   - WebSocket implementation
   - Browser notifications for new messages
   - Toast alerts for important events

2. **Message Attachments**
   - File upload support
   - Document sharing
   - Image previews

3. **Message Search**
   - Full-text search in messages
   - Filter by sender/date/priority
   - Saved searches

4. **Advanced Features**
   - Message drafts
   - Email notifications for new messages
   - Message templates
   - Message scheduling
   - Read receipts with timestamps

5. **Analytics**
   - Message activity dashboard
   - Response time tracking
   - User engagement metrics

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for errors
3. Verify MongoDB connection
4. Check environment variable configuration
5. Review API server logs

---

## 📝 Version History

**v1.0.0** - Initial Release
- Core messaging system
- Admin/Manager roles
- Configuration pages
- User management
- Authentication system

---

## 📄 License

Luxe Jewelry Management System © 2025

---

**Last Updated**: November 30, 2025
