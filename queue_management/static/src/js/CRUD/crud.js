/** @odoo-module **/

import { Component, onWillStart, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService, useBus } from "@web/core/utils/hooks";
import { ConnectionLostError, ConnectionAbortedError, RPCError } from "@web/core/network/rpc_service";
// import '../css/crud_widget.css';
import { debounce } from "@web/core/utils/timing";

export class CrudWidget extends Component {
    setup(){
        this.search = debounce(this.search.bind(this), 300);
        this.rpc = useService("rpc");
        this.notif = useService("notification");
        this.orm = useService("orm");
        useBus(this.env.bus, "ticket-updated", async () => {
            await this.loadTickets();
            this.notif.add("Tickets refreshed due to update.", { type: "info" });
        });
        this.state = useState({
            showForm: false,
            name: "",
            partner_id: "",
            service_type_id: "",
            on_date: "",
            // create_date: "",
            services: [],
            partners: [],
            tickets: [],
            searchTerm: "",
        });

        onWillStart(async () => {
            this.state.partners = await this.rpc("/queue_management/partners", {});
            this.state.services = await this.rpc("/queue_management/services", {});
            // this.loadTickets();
            this.state.tickets = await this.rpc("/queue_management/tickets", {});

        });
    }
    // helper: format "DD-Month-YYYY" (e.g., "16-September-2025")
    _formatForDateDisplay(dt) {
        if (!dt) return "";
        const d = new Date(dt);
        if (isNaN(d)) return "";
        const day = String(d.getDate()).padStart(2, "0");
        const month = d.toLocaleString("default", { month: "long" });
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    }

    openForm(ticket) {
        if (ticket) {
            // Editing an existing ticket
            this.state.editingId = ticket.id;
            // Find partner_id by name if only name is available, else use id
            if (ticket.partner_id) {
                this.state.partner_id = String(ticket.partner_id);
            } else if (ticket.partner_name) {
                const p = this.state.partners.find(x => x.name === ticket.partner_name);
                this.state.partner_id = p ? String(p.id) : "";
            } else {
                this.state.partner_id = "";
            }

            // Find service_type_id by name if only name is available, else use id
            if (ticket.service_type_id) {
                this.state.service_type_id = String(ticket.service_type_id);
            } else if (ticket.service_type_name) {
                const s = this.state.services.find(x => x.name === ticket.service_type_name);
                this.state.service_type_id = s ? String(s.id) : "";
            } else {
                this.state.service_type_id = "";
            }

            // Format date for input type="datetime-local": "YYYY-MM-DDTHH:MM"
            let s = String(ticket.on_date || "").trim();
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
                s = s.replace(" ", "T");
            }
            s = s.replace(/Z$/, "");
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
                this.state.on_date = s;
            } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
                this.state.on_date = s.slice(0,16);
            } else {
                const d = new Date(s);
                if (!isNaN(d)) {
                    const pad = n => String(n).padStart(2, "0");
                    const yyyy = d.getFullYear();
                    const mm = pad(d.getMonth() + 1);
                    const dd = pad(d.getDate());
                    const hh = pad(d.getHours());
                    const min = pad(d.getMinutes());
                    this.state.on_date = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
                } else {
                    this.state.on_date = "";
                }
            }
        } else {
            // Creating a new ticket
            this.state.editingId = null;
            this.state.partner_id = "";
            this.state.service_type_id = "";
            this.state.on_date = "";
        }
        this.state.showForm = true;
    }



    // helpers to map name->id if backend can't return ids
    _findPartnerIdByName(name) {
        if (!name) return "";
        const p = this.state.partners.find(x => x.name === name);
        return p ? String(p.id) : "";
    }
    _findServiceIdByName(name) {
        if (!name) return "";
        const s = this.state.services.find(x => x.name === name);
        return s ? String(s.id) : "";
    }


    toggleForm() {
        this.state.showForm = !this.state.showForm;
    }

    get filteredTickets() {
        const term = (this.state.searchTerm || "").toLowerCase();
        return this.state.tickets.filter(ticket => {
            const ticketName = ticket.name ? ticket.name.toLowerCase() : "";
            const customerName = ticket.partner_name ? ticket.partner_name.toLowerCase() : "";
            return ticketName.includes(term) || customerName.includes(term);
        });
    }


    async loadTickets() {
        try {
            const tickets = await this.rpc("/queue_management/tickets", {});
            this.state.tickets = tickets;

        } catch (error) {
            console.error("Error loading tickets:", error);
        }
    }

    async search() {
        try {
            const tickets = await this.rpc("/queue_management/tickets", {
                search: this.state.searchTerm,
            });
            this.state.tickets = tickets;
        } catch (error) {
            console.error("Search error:", error);
        }
    }



    async createRecord() {
        try {
            const formattedDate = this.state.on_date
                ? new Date(this.state.on_date).toISOString().slice(0, 19)
                : null;

            const payload = {
                partner_id: parseInt(this.state.partner_id),
                service_type_id: parseInt(this.state.service_type_id),
                on_date: formattedDate,
            };

            const result = await this.rpc("/queue_management/models/ticket", payload);
            console.log("Created ticket:", result);

            // Clear form
            this.state.partner_id = "";
            this.state.service_type_id = "";
            this.state.on_date = "";

            // Hide form after creation
            this.state.showForm = false;

            this.notif.add(`Ticket "${result.name}" created successfully!`, {type: "success"});
            await this.loadTickets();

        } catch (error) {
            
            if (error instanceof ConnectionLostError) {
                this.notif.add("Network connection lost. Ticket not created.", {type: "danger"});
            } else if (error instanceof ConnectionAbortedError) {
                this.notif.add("Request canceled. Ticket not created.", {type: "danger"});
            } else if (error instanceof RPCError) {
                this.notif.add("Server error while creating ticket: " + error.message, {type: "danger"});
            } else {
                console.error("Unknown error:", error);
                this.notif.add("Failed to create ticket. Check console.", {type: "danger"});
            }
        }
    }


        

    async editRecord() {
        try {
            if (!this.state.editingId) return;

            const values = {
                partner_id: parseInt(this.state.partner_id),
                service_type_id: parseInt(this.state.service_type_id),
                on_date: this.state.on_date 
                    ? new Date(this.state.on_date).toISOString().slice(0,19).replace("T", " ")
                    : null,
            };

            const updated = await this.orm.write(
                'queue.ticket', 
                [parseInt(this.state.editingId)], 
                values
            );

            if (updated) {
                this.state.showForm = false;
                this.notif.add("Ticket updated successfully!", { type: "success" });
                this.env.bus.trigger("ticket-updated");
                await this.loadTickets();
            }

        } catch (error) {
            console.error("Server-side error:", error);
            // If Odoo returns a UserError or validation error, it will be inside error.message
            this.notif.add(
                "Server error while updating ticket: " + (error.data?.message || error.message || "Check console"), 
                { type: "danger" }
            );
        }
    }







    // async loadServices() {
    //     try {
    //         const services = await this.rpc("/queue_management/services", []);
    //         this.state.services = services;
    //         console.log("Available services:", services);
    //     } catch (error) {
    //         console.error("Error loading services:", error);
    //     }
    // }



    async deleteRecord(ticket) {
        try {
            const res = await this.rpc("/queue_management/tickets/delete", { ticket_id: ticket.id });
            if (res && res.status === 'deleted') {
                this.notif.add('Ticket deleted successfully!', { type: "success" });
            } else {
                this.notif.add('Failed to delete ticket.', { type: "danger" });
            }
        } catch (error) {
            if (error instanceof ConnectionLostError) {
                this.notif.add("Network connection lost. Ticket not deleted.", { type: "danger" });
            } else if (error instanceof ConnectionAbortedError) {
                this.notif.add("Request canceled. Ticket not deleted.", { type: "danger" });
            } else if (error instanceof RPCError) {
                this.notif.add("Server error while deleting ticket: " + error.message, { type: "danger" });
            } else {
                console.error("Unknown error:", error);
                this.notif.add("Failed to delete ticket. Check console.", { type: "danger" });
            }
        }
        await this.loadTickets();
    }

    async cancelRecord(ticket) {
        try {
            const res = await this.rpc("/queue_management/tickets/cancel", { ticket_id: ticket.id });
            if (res && res.status === 'canceled') {
                this.notif.add('Ticket canceled successfully!', { type: "success" });
                this.state.showForm = false;
            } else if (res && res.status === 'error') {
                this.notif.add(res.error || 'Failed to cancel ticket.', { type: "danger" });
            } else {
                this.notif.add('Failed to cancel ticket.', { type: "danger" });
            }
        } catch (error) {
            if (error instanceof ConnectionLostError) {
                this.notif.add("Network connection lost. Ticket not canceled.", { type: "danger" });
            } else if (error instanceof ConnectionAbortedError) {
                this.notif.add("Request canceled. Ticket not canceled.", { type: "danger" });
            } else if (error instanceof RPCError) {
                this.notif.add("Server error while canceling ticket: " + error.message, { type: "danger" });
            } else {
                console.error("Unknown error:", error);
                this.notif.add("Failed to cancel ticket. Check console.", { type: "danger" });
            }
        }
        await this.loadTickets();
    }
}
    

CrudWidget.template = "crud_widget_template";
registry.category("actions").add("crud_widget_action", CrudWidget);
