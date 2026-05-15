# Ticklora - ITSM Ticketing System

A comprehensive IT Service Management (ITSM) ticketing system built with React, TypeScript, Firebase, and PHP backend.

## 🚀 Features

- **Complete Ticket Management** - Create, assign, track, and resolve tickets
- **User Management** - Role-based access control with user creation
- **Group Management** - Team and group organization
- **AI-Powered Assistance** - AI chatbot and ticket classification
- **Email & WhatsApp Notifications** - Automated alerts via PHPMailer and Twilio
- **SLA Management** - Service Level Agreement monitoring and escalation
- **Knowledge Base** - Self-service knowledge management
- **Service Catalog** - IT service offerings
- **Reports & Analytics** - Comprehensive reporting dashboard
- **Timesheet System** - Time tracking and approval workflow
- **Change Management** - ITIL-compliant change control
- **Problem Management** - Root cause analysis and problem resolution

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Node.js + Express + PHP
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Notifications:** PHPMailer + Twilio WhatsApp
- **AI Integration:** Google Gemini API
- **Styling:** Tailwind CSS + Lucide Icons

## 📦 Installation

### Prerequisites

- Node.js 18+
- PHP 8.0+
- Composer
- Firebase project with service account

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/swedhasris/ticketing_system_.git
cd ticketing_system_
```

2. **Install frontend dependencies**

```bash
npm install
```

3. **Install backend dependencies**

```bash
cd php-backend
composer install
```

4. **Configure environment variables**
   Create a `.env` file in the root directory:

```env
# Firebase Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=noreply@company.com
SMTP_FROM_NAME="IT Service Desk"

# Twilio Configuration (Optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

5. **Setup Firebase**

- Replace `firebase-applet-config.json` with your Firebase configuration
- Ensure Firestore database rules allow read/write access

6. **Start the servers**

```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:frontend  # Frontend on port 5173
npm run dev:backend   # Backend on port 3000
```

## 🏗️ Project Structure

```
merged_main/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AppNavbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── AIChatbot.tsx
│   │   └── ErrorBoundary.tsx
│   ├── contexts/           # React contexts for state management
│   │   ├── AuthContext.tsx
│   │   └── TicketsContext.tsx
│   ├── lib/              # Utility functions and configurations
│   │   ├── firebase.ts
│   │   ├── roles.ts
│   │   ├── seed.ts
│   │   ├── serviceCatalog.ts
│   │   └── utils.ts
│   └── pages/             # Page components
│       ├── Dashboard.tsx
│       ├── Tickets.tsx
│       ├── Users.tsx
│       ├── Settings.tsx
│       └── ... (27 total pages)
├── php-backend/
│   ├── mail/             # Email and SMS services
│   │   ├── MailConfig.php
│   │   ├── TicketMailer.php
│   │   ├── TicketNotifier.php
│   │   └── NotificationService.php
│   ├── timesheet/         # Timesheet management
│   └── index.php          # Main PHP backend
└── server.ts             # Node.js server with API endpoints
```

## 🔧 Adding New Modules

### 1. Create New Page Component

Create a new file in `src/pages/` following the naming convention:

```typescript
// src/pages/NewModule.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NewModule() {
  const { profile } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check access permissions
  const hasAccess = profile?.role === "admin" || profile?.role === "super_admin";
  
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-muted-foreground opacity-20" />
        <h2 className="text-2xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground">Only administrators can access this module.</p>
      </div>
    );
  }

  useEffect(() => {
    // Fetch data from Firebase
    const loadData = async () => {
      try {
        // Your data fetching logic here
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-sn-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">New Module</h1>
        <p className="text-muted-foreground">Manage your new module here.</p>
      </div>
    
      {/* Your module content here */}
      <div className="sn-card">
        <h2 className="text-xl font-bold mb-4">Module Features</h2>
        <p>Build your module interface here...</p>
      </div>
    </div>
  );
}
```

### 2. Add Route Configuration

Add your new route to `src/App.tsx`:

```typescript
// Add to lazy imports
const NewModule = lazy(() => import("./pages/NewModule").then(m => ({ default: m.NewModule })));

// Add to routes section
<Route 
  path="/new-module" 
  element={
    <ProtectedRoute>
      <NewModule />
    </ProtectedRoute>
  } 
/>
```

### 3. Add Sidebar Navigation

Add your module to the sidebar in `src/components/Sidebar.tsx`:

```typescript
// Add to menuStructure array
{
  label: "New Section",
  items: [
    { icon: Settings2, label: "New Module", path: "/new-module", adminOnly: true }
  ]
}
```

### 4. Add Backend API Endpoints

Add your API endpoints to `server.ts`:

```typescript
// GET endpoint for fetching data
app.get("/api/new-module/all", async (req, res) => {
  try {
    const snapshot = await getDb().collection("new_collection").get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// POST endpoint for creating data
app.post("/api/new-module/create", async (req, res) => {
  try {
    const data = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await getDb().collection("new_collection").add(data);
    res.json({ id: docRef.id, ...data });
  } catch (error) {
    res.status(500).json({ error: "Failed to create item" });
  }
});

// PUT endpoint for updating data
app.put("/api/new-module/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await getDb().collection("new_collection").doc(id).update(updateData);
    res.json({ id, ...updateData });
  } catch (error) {
    res.status(500).json({ error: "Failed to update item" });
  }
});

// DELETE endpoint for removing data
app.delete("/api/new-module/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await getDb().collection("new_collection").doc(id).delete();
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete item" });
  }
});
```

### 5. Add PHP Backend Support (Optional)

If you need PHP backend features, add to `php-backend/index.php`:

```php
<?php
// Add your new module endpoints
header('Content-Type: application/json');

// GET all items
if ($_SERVER['REQUEST_METHOD'] === 'GET' && !isset($_GET['id'])) {
    $collection = $firestore->collection('new_collection');
    $documents = $collection->documents();
    $items = [];
  
    foreach ($documents as $doc) {
        $items[] = array_merge(['id' => $doc->id()], $doc->data());
    }
  
    echo json_encode($items);
}

// Create new item
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $data = array_merge($input, [
        'createdAt' => new DateTime(),
        'updatedAt' => new DateTime()
    ]);
  
    $collection = $firestore->collection('new_collection');
    $document = $collection->add($data);
  
    echo json_encode(array_merge(['id' => $document->id()], $data));
}
?>
```

### 6. Add Email/WhatsApp Notifications (Optional)

Extend the notification system in `php-backend/mail/`:

```php
<?php
// Add to TicketNotifier.php
class NewModuleNotifier {
    public static function sendNotification($data) {
        // Send email notification
        require_once __DIR__ . '/TicketMailer.php';
        TicketMailer::sendNotificationEmail(
            $data['email'],
            "New Module Alert",
            "A new item was created in the module."
        );
      
        // Send WhatsApp notification
        require_once __DIR__ . '/NotificationService.php';
        if (!empty($data['phone'])) {
            NotificationService::sendWhatsApp(
                $data['phone'],
                "📋 New Module: " . $data['title']
            );
        }
    }
}
?>
```

### 7. Add AI Integration (Optional)

Add AI endpoints to `server.ts`:

```typescript
// AI-powered module assistance
app.post("/api/ai/new-module", async (req, res) => {
  try {
    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
  
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: "You are an expert assistant for the new module. Provide helpful suggestions."
    });

    const result = await model.generateContent(text);
    res.json({ response: result.response.text() });
  } catch (error) {
    res.status(500).json({ error: "AI assistance failed" });
  }
});
```

## 🔐 Role-Based Access Control

The system uses hierarchical roles:

- **user** - Basic access, can create tickets
- **agent** - Can manage tickets and view reports
- **sub_admin** - Can manage basic admin functions
- **admin** - Full administrative access
- **super_admin** - Can manage system settings
- **ultra_super_admin** - Complete system control

Use these in your module components:

```typescript
import { useAuth } from "../contexts/AuthContext";

const { profile } = useAuth();

// Check specific role
if (profile?.role === "admin") {
  // Admin-only functionality
}

// Check minimum role level
import { ROLE_HIERARCHY } from "../lib/roles";
if (ROLE_HIERARCHY[profile?.role] >= ROLE_HIERARCHY["admin"]) {
  // Admin and above
}
```

## 🎨 UI Components

The system uses custom UI components:

```typescript
// Cards
<div className="sn-card">Content here</div>

// Buttons
<Button variant="default">Click me</Button>
<Button variant="outline">Cancel</Button>

// Icons
import { Settings, Users, Shield } from "lucide-react";

// Loading states
{loading && (
  <div className="w-12 h-12 border-4 border-sn-green border-t-transparent rounded-full animate-spin" />
)}
```

## 📊 Data Models

Follow these patterns for Firestore collections:

```typescript
// Standard document structure
interface Document {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
  // Your custom fields here
}

// Example: Ticket structure
interface Ticket {
  id: string;
  title: string;
  description: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  priority: "Low" | "Medium" | "High" | "Critical";
  category: string;
  assignedTo?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  history: Array<{
    action: string;
    timestamp: string;
    user: string;
  }>;
}
```

## 🚀 Deployment

### Frontend (Vercel/Netlify)

```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

### Backend (Heroku/Railway)

```bash
# Deploy server.ts and php-backend/ directory
# Ensure environment variables are set
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-module`
3. Make your changes following the patterns above
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue in the GitHub repository
- Check the documentation above
- Review existing modules for patterns

---

**Built with ❤️ using modern web technologies for efficient IT service management.**
