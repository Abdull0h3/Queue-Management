from odoo import models, fields, api
import logging

_logger = logging.getLogger(__name__)

class InvoiceReportWizard(models.TransientModel):
    _name = "invoice.report.wizard"
    _description = "Invoice Report Wizard"

    report_type = fields.Selection(
        [
            ('pdf', 'PDF'),
            ('html', 'HTML (Web)'),
            ('excel', 'Excel'),
            ('word', 'Word'),
        ],
        string="Report Format",
        required=True,
        default="pdf"
    )

    start_date = fields.Date(string="Start Date", required=True)
    end_date = fields.Date(string="End Date", required=True)

    def action_generate_report(self):
        self.ensure_one()
        invoices = self.env["invoice.out"].search([
            ("state", "=", "posted"),
            ("invoice_date", ">=", self.start_date),
            ("invoice_date", "<=", self.end_date),
        ])
        if not invoices:
            _logger.warning("No invoices found for the selected date range: %s to %s", self.start_date, self.end_date)
        else:
            _logger.info("Invoices found: %s", invoices.ids)

        if self.report_type == 'pdf':
            return self.env.ref("queue_management.invoice_out").with_context(start_date=self.start_date, end_date=self.end_date).report_action(invoices)


        elif self.report_type == 'html':
            return {
                'type': 'ir.actions.act_url',
                'url': '/report/html/queue_management.invoice_out/%s' % ','.join(map(str, invoices.ids)),
                'target': 'new',
            }

        elif self.report_type == 'excel':
            return self.env.ref("queue_management.invoice_out_report_xlsx").report_action(invoices)


        elif self.report_type == 'word':
            return self.env.ref("queue_management.invoice_out_report_docx").report_action(invoices)

