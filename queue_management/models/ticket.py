# ticket.py

from datetime import timedelta
from odoo import models, fields, api, Command
from odoo.exceptions import UserError

class QueueTicket(models.Model):
    _name = "queue.ticket"
    _description = "Queue Ticket"
    _order = "create_date asc"
    _rec_name = "name"

    name = fields.Char(
        string="Ticket Number", 
        required=True, 
        copy=False, 
        readonly=True,
        default="New"
    )
    status = fields.Selection([
        ('new', 'New'),
        ('waiting', 'Waiting'),
        ('cancelled', 'Cancelled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('skipped', 'Skipped'),
        ('delayed', 'Delayed')
    ], default='new', string="Status", compute="_compute_status", store=True)
    assigned_counter_id = fields.Many2one('queue.counter', string="Counter", readonly=True, ondelete='restrict')
    partner_id = fields.Many2one('res.partner', string="Customer", ondelete='restrict', required=True)
    phone = fields.Char(string="Phone", related='partner_id.phone', readonly=True)
    email = fields.Char(string="Email", related='partner_id.email', readonly=True)
    create_date = fields.Datetime(string="Created On", readonly=True, default=fields.Datetime.now)
    on_date = fields.Datetime(string="Created On")
    service_type_id = fields.Many2one('queue.service', string="Service", required=True)
    called_by_user = fields.Many2one('res.users', string="Called By", readonly=True, default=lambda self: self.env.user)
    called_at = fields.Datetime(string="Called At", readonly=True)
    serv_price = fields.Float(string="Service Price", related='service_type_id.price', readonly=True, store=True)




    @api.model_create_multi
    def create(self, vals_queue):
        # Pre-check for existing waiting tickets
        for vals in vals_queue:
            partner_id = vals.get('partner_id')
            if partner_id:
                existing_ticket = self.env['queue.ticket'].search([
                    ('partner_id', '=', partner_id),
                    ('status', '=', 'waiting')
                ], limit=1)
                if existing_ticket:
                    raise UserError("This customer already has a waiting ticket.")

        # Assign sequence after checks
        for vals in vals_queue:
            if vals.get('name', 'New') == 'New':
                vals['name'] = self.env['ir.sequence'].next_by_code('queue.ticket') or 'New'

        tickets = super().create(vals_queue)

        # Create linked invoice.out record
        for ticket in tickets:
            if ticket.service_type_id and ticket.partner_id:
                self.env['invoice.out'].create({
                    'name': ticket.name,
                    'partner_id': ticket.partner_id.id,
                    'invoice_date': ticket.create_date,
                    'due_date': ticket.create_date + timedelta(days=1),
                    'amount_total': ticket.service_type_id.price,
                    'service_type_id': ticket.service_type_id.id,
                    'state': 'draft',
                })

        return tickets
    
    def write(self, vals):
        for record in self:
            partner_id = vals.get('partner_id', record.partner_id.id)
            new_status = vals.get('status', record.status)

            # Only enforce if ticket is (or will be) waiting
            if partner_id and new_status == 'waiting':
                existing_ticket = self.env['queue.ticket'].search([
                    ('partner_id', '=', partner_id),
                    ('status', '=', 'waiting'),
                    ('id', '!=', record.id),  # exclude current ticket
                ], limit=1)
                if existing_ticket:
                    raise UserError("This customer already has a waiting ticket.")

        return super().write(vals)



    def action_cancel(self):
        """Cancel the current ticket"""
        self.ensure_one()
        if self.status == 'waiting':
            self.status = 'cancelled'
            invoice = self.env['invoice.out'].search([('name', '=', self.name)], limit=1)
            if invoice:
                invoice.state = 'cancelled'
        else:
            raise UserError("Only tickets in 'Waiting' status can be cancelled.")

    @api.depends('name')
    def _compute_status(self):
        for record in self:
            if record.name != 'New':
                if record.status == 'new':
                    record.status = 'waiting'


