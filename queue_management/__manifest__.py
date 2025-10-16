# __manifest__.py

{
    "name": "Queue Management",
    "version": "1.0",
    "category": "Operations",
    "summary": "Manage customer queues with multiple counters and sequential tickets.",
    "author": "Your Name",
    "depends": ["base", "web", "account"],
    "data": [
        "security/ir.model.access.csv",
        "data/sequence.xml",
        "views/ticket_views.xml",
        "views/queue_management_menu_actions.xml",
        "views/counter_views.xml",
        "views/kiosk_views.xml",
        "views/service_type_views.xml",
        "views/queue_management_dashboard.xml",
        "reports/invoice_out_report.xml",
        "views/wizard_invoice_report.xml",
        "views/invoice_out_views.xml",
        "views/crud_view.xml",
        
    ],
    "installable": True,
    "application": True,
    "auto_install": False,
    "license": "LGPL-3",
        "assets": {
            "web.assets_backend": [
                "queue_management/static/src/js/**/*.js",
                "queue_management/static/src/xml/**/*.xml",
                "queue_management/static/src/css/**/*.css",
            ],

    }
}
