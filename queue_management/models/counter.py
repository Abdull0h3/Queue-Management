from odoo import models, fields, api
from odoo.exceptions import UserError


class QueueCounter(models.Model):
    _rec_name = "counter_name"
    _name = "queue.counter"
    _description = "Queue Counter"

    counter_name = fields.Char(string="Counter Name", required=True)
    is_active = fields.Boolean(string="Active", default=True)
    current_ticket_id = fields.Many2one('queue.ticket', string="Current Ticket", readonly=True)
    current_ticket_status = fields.Selection(
        related='current_ticket_id.status',
        string="Current Ticket Status",
        readonly=True
    )

    ticket_ids = fields.One2many('queue.ticket', 'assigned_counter_id', string="Tickets")


    def view_counter_ticket_form(self):
        """Open the custom ticket form view for this counter"""
        self.ensure_one()
        view_id = self.env.ref('queue_management.view_counter_ticket_form').id
        return {
            'type': 'ir.actions.act_window',
            'name': 'Ticket In Service',
            'res_model': 'queue.counter',
            'view_mode': 'form',
            'view_id': view_id,
            'res_id': self.id,
            'target': 'current',
            'context': self.env.context,
        }
    def action_skip_ticket(self):
        """Skip the current ticket"""
        self.ensure_one()
        if self.current_ticket_status != 'in_progress':
            raise UserError("Only tickets in 'In Progress' status can be delayed.")
        self.current_ticket_id.write({'status': 'skipped'})
        invoice = self.env['invoice.out'].search([('name', '=', self.current_ticket_id.name)], limit=1)
        if invoice:
            invoice.counter_id = self.id
            invoice.state = 'cancelled'

    def action_complete_ticket(self):
        """Complete the current ticket"""
        self.ensure_one()
        if self.current_ticket_status != 'in_progress':
            raise UserError("Only tickets in 'In Progress' status can be delayed.")
        invoice = self.env['invoice.out'].search([('name', '=', self.current_ticket_id.name)], limit=1)
        if invoice:
            invoice.counter_id = self.id
            invoice.state = 'posted'
        self.current_ticket_id.write({'status': 'completed'})

    def action_delayed_ticket(self):
        """Delay the current ticket"""
        self.ensure_one()
        if self.current_ticket_status != 'in_progress':
            raise UserError("Only tickets in 'In Progress' status can be delayed.")
        # Mark ticket delayed; write_date updates, which we use to control recall order
        self.current_ticket_id.write({'status': 'delayed'})
        # Unset current ticket on this counter so we can call/recall others
        self.write({'current_ticket_id': False})
    
    def get_next_ticket(self):
        """Get the next waiting ticket in FIFO order"""
        next_ticket = self.env['queue.ticket'].search([('status', '=', 'waiting')], order='create_date asc', limit=1)
        if not next_ticket:
            raise UserError("No tickets available in 'Waiting' status.")
        return next_ticket

    def action_call_next_ticket(self):
        """Call the next ticket and assign it to this counter"""
        self.ensure_one()
        next_ticket = self.get_next_ticket()
        if next_ticket:
            next_ticket.write({
                'assigned_counter_id': self.id,
                'status': 'in_progress',
                'called_by_user': self.env.user.id,
                'called_at': fields.Datetime.now()
            })
            self.write({'current_ticket_id': next_ticket.id})
        return True
    

    def action_recall_delayed_ticket(self):
        """Recall the first delayed ticket and assign it to this counter"""
        self.ensure_one()
        # Order by write_date so tickets delayed again move to the end of the queue
        delayed_ticket = self.env['queue.ticket'].search(
            [('status', '=', 'delayed')],
            order='write_date asc',
            limit=1
        )
        if not delayed_ticket:
            raise UserError("No delayed tickets to recall.")
        delayed_ticket.write({
            'status': 'in_progress',
            'assigned_counter_id': self.id,
            'called_by_user': self.env.user.id,
            'called_at': fields.Datetime.now()
        })
        self.write({'current_ticket_id': delayed_ticket.id})
        return True
