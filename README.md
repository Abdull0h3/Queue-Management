# Queue Management System for Odoo

![License: LGPL-3](https://img.shields.io/badge/license-LGPL--3-blue.svg)
![Odoo Version](https://img.shields.io/badge/Odoo-17.0-purple.svg)

A comprehensive Queue Management System for Odoo that helps businesses manage customer queues efficiently with multiple service counters, automatic ticket generation, and real-time tracking.

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Models](#models)
- [API Endpoints](#api-endpoints)
- [Screenshots](#screenshots)
- [Technical Details](#technical-details)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Core Features

- **🎫 Automated Ticket Generation**
  - Sequential ticket numbering with custom prefix (T00001, T00002, etc.)
  - Automatic status tracking (New → Waiting → In Progress → Completed)
  - Customer validation to prevent duplicate waiting tickets

- **🏢 Multi-Counter Management**
  - Create and manage multiple service counters
  - Assign tickets to specific counters
  - Track current ticket status per counter
  - Counter activation/deactivation

- **🛎️ Service Types**
  - Define multiple service types with pricing
  - Link services to products
  - Track tickets per service type

- **📊 Interactive Dashboard**
  - Real-time KPI cards showing queue statistics
  - Chart visualizations for queue analytics
  - Custom JavaScript widgets for data visualization
  - CRUD operations widget for quick management

- **👥 Customer Management**
  - Integrated with Odoo's partner/customer records
  - Display customer contact information (phone, email)
  - Customer-specific ticket history

- **💰 Automated Invoice Generation**
  - Automatic invoice creation when ticket is generated
  - Invoice tracking with draft/posted/cancelled states
  - Service pricing integration
  - Due date calculation

- **🎮 Counter Operations**
  - **Call Next**: Automatically call the next waiting ticket in FIFO order
  - **Complete**: Mark current ticket as completed and post invoice
  - **Skip**: Skip the current ticket and cancel associated invoice
  - **Delay**: Put current ticket on hold for later recall
  - **Recall Delayed**: Bring back delayed tickets in order

- **🖥️ Kiosk Mode**
  - Self-service ticket generation interface
  - User-friendly customer-facing views

- **🔌 RESTful API**
  - JSON API endpoints for external integration
  - CRUD operations for tickets
  - Service and customer data retrieval
  - Ticket cancellation endpoint

- **📄 Reports**
  - Custom invoice reports
  - Ticket reports with filtering options
  - Export capabilities

## 🚀 Installation

### Prerequisites

- Odoo 17.0 or higher
- Python 3.8+
- Required Odoo modules:
  - `base`
  - `web`
  - `account`

### Steps

1. Clone or download this module to your Odoo addons directory:

```bash
cd /path/to/odoo/addons
git clone <repository-url> queue_management
```

2. Update the addons list:
   - Navigate to Apps menu in Odoo
   - Click "Update Apps List"
   - Search for "Queue Management"

3. Install the module:
   - Click "Install" button

4. Restart Odoo server (if needed):

```bash
sudo service odoo restart
```

## ⚙️ Configuration

### Initial Setup

1. **Configure Service Types**
   - Go to `Queue Management > Configuration > Service Types`
   - Create new service types with names and prices
   - Link each service to a product

2. **Setup Counters**
   - Navigate to `Queue Management > Configuration > Counters`
   - Create counters (e.g., Counter 1, Counter 2, etc.)
   - Mark counters as active

3. **Configure Security**
   - Assign appropriate user groups
   - Default access: all authenticated users can manage tickets

### Access Rights

The module provides full CRUD access to authenticated users for:
- Queue Tickets
- Counters
- Service Types
- Invoices
- Dashboard

## 📖 Usage

### Creating a Ticket

1. **Manual Creation**:
   - Go to `Queue Management > Tickets`
   - Click "Create"
   - Select customer and service type
   - Click "Save"
   - Ticket number is automatically generated
   - Status automatically changes to "Waiting"

2. **Via Kiosk**:
   - Open Kiosk view
   - Select service type
   - Enter customer information
   - Generate ticket

3. **Via API**:
```json
POST /queue_management/models/ticket
{
    "partner_id": 123,
    "service_type_id": 1,
    "on_date": "2024-01-01T10:00:00"
}
```

### Managing Counter Operations

1. **Open Counter View**:
   - Navigate to `Queue Management > Counters`
   - Select a counter
   - Click "View Counter Ticket Form"

2. **Call Next Ticket**:
   - Click "Call Next" button
   - System assigns oldest waiting ticket
   - Ticket status changes to "In Progress"

3. **Handle Current Ticket**:
   - **Complete**: Finish service and post invoice
   - **Skip**: Cancel ticket and its invoice
   - **Delay**: Put ticket on hold, free counter for next ticket

4. **Recall Delayed Tickets**:
   - Click "Recall Delayed Ticket"
   - Oldest delayed ticket is assigned

### Dashboard Usage

1. Navigate to `Queue Management > Dashboard`
2. View real-time statistics:
   - Total tickets
   - Waiting tickets
   - Completed tickets
   - Active counters
3. Interact with charts for detailed analytics
4. Use CRUD widget for quick ticket management

### Canceling a Ticket

Only tickets in "Waiting" status can be cancelled:

1. **Manual**:
   - Open ticket record
   - Click "Cancel" button

2. **Via API**:
```json
POST /queue_management/tickets/cancel
{
    "ticket_id": 123
}
```

## 🗂️ Models

### queue.ticket

Main model for queue tickets.

**Fields**:
- `name`: Ticket number (auto-generated)
- `status`: Ticket status (new/waiting/in_progress/completed/cancelled/skipped/delayed)
- `assigned_counter_id`: Assigned counter
- `partner_id`: Customer reference
- `service_type_id`: Service type
- `phone`: Customer phone (related field)
- `email`: Customer email (related field)
- `create_date`: Creation timestamp
- `called_by_user`: User who called the ticket
- `called_at`: Call timestamp
- `serv_price`: Service price (related field)

**Constraints**:
- One waiting ticket per customer at a time
- Sequential ticket numbering

### queue.counter

Service counter model.

**Fields**:
- `counter_name`: Counter name
- `is_active`: Active status
- `current_ticket_id`: Currently serving ticket
- `current_ticket_status`: Current ticket status (related)
- `ticket_ids`: All assigned tickets

**Methods**:
- `action_call_next_ticket()`: Call next waiting ticket
- `action_complete_ticket()`: Complete current ticket
- `action_skip_ticket()`: Skip current ticket
- `action_delayed_ticket()`: Delay current ticket
- `action_recall_delayed_ticket()`: Recall delayed ticket

### queue.service

Service type definition.

**Fields**:
- `name`: Service name
- `price`: Service price
- `product_id`: Linked product
- `ticket_ids`: Related tickets

### invoice.out

Automated invoice model.

**Fields**:
- `name`: Invoice number (linked to ticket)
- `partner_id`: Customer
- `invoice_date`: Invoice date
- `due_date`: Due date (create_date + 1 day)
- `amount_total`: Total amount (from service price)
- `service_type_id`: Service type
- `counter_id`: Counter that handled the ticket
- `state`: Invoice status (draft/posted/cancelled)

**Constraints**:
- Amount must be positive

## 🔌 API Endpoints

All API endpoints use JSON format and require user authentication.

### Create Ticket
```
POST /queue_management/models/ticket
Body: {
    "partner_id": <int>,
    "service_type_id": <int>,
    "on_date": <ISO datetime string>
}
```

### Get All Tickets
```
POST /queue_management/tickets
Returns: Array of ticket objects
```

### Get All Services
```
POST /queue_management/services
Returns: Array of service objects
```

### Get All Partners
```
POST /queue_management/partners
Returns: Array of partner objects
```

### Update Ticket
```
POST /queue_management/tickets/update
Body: {
    "ticket_id": <int>,
    "partner_id": <int> (optional),
    "service_type_id": <int> (optional),
    "on_date": <datetime string> (optional)
}
```

### Delete Ticket
```
POST /queue_management/tickets/delete
Body: {
    "ticket_id": <int>
}
```

### Cancel Ticket
```
POST /queue_management/tickets/cancel
Body: {
    "ticket_id": <int>
}
```

## 📸 Screenshots

*Screenshots will be added here showcasing:*
- Ticket creation form
- Counter management view
- Dashboard with analytics
- Kiosk interface
- Invoice report

## 🔧 Technical Details

### Module Structure

```
queue_management/
├── __init__.py
├── __manifest__.py
├── controllers/
│   ├── __init__.py
│   └── api.py                    # RESTful API endpoints
├── data/
│   └── sequence.xml              # Ticket sequence definition
├── models/
│   ├── __init__.py
│   ├── counter.py                # Counter model and logic
│   ├── dashboard.py              # Dashboard model
│   ├── invoice_out.py            # Invoice model
│   ├── service_type.py           # Service type model
│   └── ticket.py                 # Main ticket model
├── reports/
│   └── invoice_out_report.xml    # Invoice report template
├── security/
│   └── ir.model.access.csv       # Access rights
├── static/
│   ├── description/
│   │   └── qm.png                # Module icon
│   └── src/
│       ├── css/
│       │   └── crud_widget.css
│       ├── js/
│       │   ├── chart_renderer/
│       │   ├── CRUD/
│       │   ├── Kpi_card/
│       │   └── queue_management_dashboard.js
│       └── xml/
│           ├── chart_renderer.xml
│           ├── crud.xml
│           ├── kpi_card.xml
│           └── queue_management_dashboard.xml
├── views/
│   ├── counter_views.xml
│   ├── crud_view.xml
│   ├── invoice_out_views.xml
│   ├── kiosk_views.xml
│   ├── queue_management_dashboard.xml
│   ├── queue_management_menu_actions.xml
│   ├── service_type_views.xml
│   ├── ticket_views.xml
│   └── wizard_invoice_report.xml
├── wizard/
│   ├── __init__.py
│   └── wizard_invoice_report.py
└── README.md
```

### Dependencies

- **base**: Core Odoo functionality
- **web**: Web interface and assets
- **account**: For invoice integration and product linking

### JavaScript Components

The module includes custom OWL (Odoo Web Library) components:

1. **Chart Renderer**: Interactive charts for queue statistics
2. **CRUD Widget**: Quick create/read/update/delete operations
3. **KPI Card**: Dashboard KPI display widgets
4. **Dashboard Controller**: Main dashboard orchestration

### Database Schema

**Key Relationships**:
- `queue.ticket` → `queue.counter` (Many2one): Ticket assigned to counter
- `queue.ticket` → `res.partner` (Many2one): Ticket for customer
- `queue.ticket` → `queue.service` (Many2one): Ticket service type
- `invoice.out` → `queue.ticket` (One2one via name): Invoice for ticket
- `invoice.out` → `queue.counter` (Many2one): Invoice processed at counter

### Workflow

```
Customer arrives → Ticket created (New) → Automatic transition to Waiting
                                                           ↓
                                              Counter calls ticket (In Progress)
                                                           ↓
                              ┌──────────────────────────┴──────────────────────────┐
                              ↓                          ↓                           ↓
                         Complete                      Skip                        Delay
                       (Invoice Posted)          (Invoice Cancelled)        (Back to queue)
                              ↓                          ↓                           ↓
                          Completed                   Skipped                    Delayed
                                                                                     ↓
                                                                            Recall Delayed
                                                                                     ↓
                                                                              In Progress
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Standards

- Follow PEP 8 for Python code
- Use meaningful variable and function names
- Add docstrings to all public methods
- Write unit tests for new features
- Update documentation for user-facing changes

## 📝 License

This module is licensed under the LGPL-3 License. See the LICENSE file for details.

## 👤 Author

**Your Name**

- GitHub: [@yourusername](https://github.com/yourusername)

## 🙏 Acknowledgments

- Odoo Community for the excellent framework
- Contributors and testers

## 📞 Support

For support, please:
- Open an issue on GitHub
- Contact the maintainer
- Check Odoo documentation for framework-specific questions

## 🗺️ Roadmap

Future enhancements planned:

- [ ] SMS/Email notifications when ticket is called
- [ ] Priority queue support
- [ ] Appointment scheduling
- [ ] Multi-language support for kiosk
- [ ] Mobile app integration
- [ ] Advanced analytics and reporting
- [ ] Ticket transfer between counters
- [ ] VIP customer handling
- [ ] Service time tracking and SLA monitoring
- [ ] Queue display board for customers

## 📊 Statistics

- **Lines of Code**: ~1,500
- **Models**: 5
- **Views**: 10
- **API Endpoints**: 7
- **JavaScript Widgets**: 4

---

**Made with ❤️ for the Odoo Community**

