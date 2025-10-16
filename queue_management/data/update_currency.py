# This is a one-time script to update existing invoices without currency
# Run this in Odoo shell or as a data migration

def update_invoice_currencies():
    """Update existing invoices that don't have a currency set"""
    invoices_without_currency = env['invoice.out'].search([('currency_id', '=', False)])
    if invoices_without_currency:
        company_currency = env.company.currency_id
        invoices_without_currency.write({'currency_id': company_currency.id})
        print(f"Updated {len(invoices_without_currency)} invoices with currency: {company_currency.name}")
    else:
        print("All invoices already have currency set")

# Uncomment the line below to run this script
# update_invoice_currencies()
