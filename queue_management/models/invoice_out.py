from odoo import models, fields, api
from odoo.exceptions import UserError

class InvoiceOut(models.Model):
    _name = "invoice.out"
    _description = "Invoice Out"

    name = fields.Char(string="Number")
    partner_id = fields.Many2one('res.partner', string="Customer")
    invoice_date = fields.Date(string="Invoice Date")
    due_date = fields.Date(string="Due Date")
    amount_total = fields.Float(string="Total")
    currency_id = fields.Many2one('res.currency', string="Currency", default=lambda self: self.env.company.currency_id)
    service_type_id = fields.Many2one('queue.service', string="Service", required=True)
    counter_id = fields.Many2one('queue.counter', string="Counter")
    state = fields.Selection([
        ('draft', 'Draft'),
        ('posted', 'Posted'),
        ('cancelled', 'Cancelled')
    ], string="Status", default='draft')

    @api.model
    def create(self, vals):
        if not vals.get('currency_id'):
            vals['currency_id'] = self.env.company.currency_id.id
        return super().create(vals)

    @api.constrains("amount_total")
    def _check_amount(self):
        for record in self:
            if record.amount_total <= 0:
                raise UserError("The total amount must be positive.")

