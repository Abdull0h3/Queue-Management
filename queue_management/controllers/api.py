# api.py

from odoo import http
from odoo.http import request
from datetime import datetime


class QueueManagementAPI(http.Controller):

    @http.route('/queue_management/models/ticket', type='json', auth='user', methods=['POST'])
    def create_ticket(self, **kwargs):
        required_fields = ['partner_id', 'service_type_id']
        for field in required_fields:
            if not kwargs.get(field):
                return {'error': f'Missing required field: {field}'}

        on_date = kwargs.get('on_date')
        if on_date:
            # Convert ISO format to Odoo datetime format
            on_date = datetime.fromisoformat(on_date).strftime('%Y-%m-%d %H:%M:%S')

        Ticket = request.env['queue.ticket']
        ticket = Ticket.create({
            'partner_id': kwargs['partner_id'],
            'service_type_id': kwargs['service_type_id'],
            'on_date': on_date,
        })
        return {'id': ticket.id, 'name': ticket.name}
    
    @http.route('/queue_management/tickets', type='json', auth='user', methods=['POST'])
    def get_tickets(self):
        tickets = request.env['queue.ticket'].search([])
        return [
            {
                'id': ticket.id,
                'name': ticket.name,
                'status': ticket.status,
                'partner_id': ticket.partner_id.id,                # numeric id
                'partner_name': ticket.partner_id.name,
                'service_type_id': ticket.service_type_id.id,      # numeric id
                'service_type_name': ticket.service_type_id.name,
                'on_date': ticket.on_date or ticket.create_date,   # pick whichever you want for edit
            }
            for ticket in tickets
        ]

    @http.route('/queue_management/services', type='json', auth='user', methods=['POST'])
    def get_services(self):
        services = request.env['queue.service'].search([])
        return [
            {
                'id': service.id,
                'name': service.name,
                'price': service.price,
                'product_id': service.product_id.id,
            }
            for service in services
        ]
    
    @http.route('/queue_management/partners', type='json', auth='user', methods=['POST'])
    def get_partners(self):
        partners = request.env['res.partner'].search([])
        return [
            {
                'id': partner.id,
                'name': partner.name,
                'email': partner.email,
                'phone': partner.phone,
            }
            for partner in partners
        ]
    

    @http.route('/queue_management/tickets/update', type='json', auth='user', methods=['POST'])
    def update_ticket(self, **kwargs):
        ticket_id = kwargs.get('ticket_id')
        if not ticket_id:
            return {'status': 'error', 'error': 'missing id'}
        ticket = request.env['queue.ticket'].sudo().browse(int(ticket_id))
        if not ticket.exists():
            return {'status': 'error', 'error': 'not_found'}
        vals = {}
        if 'partner_id' in kwargs and kwargs['partner_id']:
            vals['partner_id'] = int(kwargs['partner_id'])
        if 'service_type_id' in kwargs and kwargs['service_type_id']:
            vals['service_type_id'] = int(kwargs['service_type_id'])
        if 'on_date' in kwargs and kwargs['on_date']:
            # convert if needed from ISO w/ T to Odoo datetime 'YYYY-MM-DD HH:MM:SS'
            vals['on_date'] = kwargs['on_date'].replace('T', ' ')
        ticket.write(vals)
        return {'status': 'updated', 'name': ticket.name}



    @http.route('/queue_management/tickets/delete', type='json', auth='user', methods=['POST'])
    def delete_ticket(self, **kwargs):
        ticket_id = kwargs.get('ticket_id')
        if not ticket_id:
            return {'status': 'error', 'error': 'missing id'}
        ticket = request.env['queue.ticket'].sudo().browse(int(ticket_id))
        if ticket.exists():
            ticket.unlink()
            return {'status': 'deleted'}
        return {'status': 'not_found'}
    

    @http.route('/queue_management/tickets/cancel', type='json', auth='user', methods=['POST'])
    def cancel_ticket(self, **kwargs):
        ticket_id = kwargs.get('ticket_id')
        if not ticket_id:
            return {'status': 'error', 'error': 'missing id'}
        ticket = request.env['queue.ticket'].sudo().browse(int(ticket_id))
        if not ticket.exists():
            return {'status': 'error', 'error': 'not_found'}
        if ticket.status != 'waiting':
            return {'status': 'error', 'error': 'only waiting tickets can be canceled'}
        ticket.action_cancel()
        return {'status': 'canceled', 'name': ticket.name}