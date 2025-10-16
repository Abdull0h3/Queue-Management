# service_type.py
from odoo import models, fields, api


class QueueService(models.Model):
    _name = "queue.service"
    _description = "Queue Service"

    name = fields.Char(string="Service Name", required=True, store= True)
    price = fields.Float(string="Service Price", required=True, store=True)
    ticket_ids = fields.One2many('queue.ticket', 'service_type_id', string="Tickets")

    product_id = fields.Many2one('product.product', string="Product", required=True)
