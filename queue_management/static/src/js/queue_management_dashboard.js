/** @odoo-module **/

import { Component, onWillStart, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { KPICard } from "./Kpi_card/kpi_card";
import { ChartRenderer } from "./chart_renderer/chart_renderer";
import { useService } from "@web/core/utils/hooks";
import { getColor } from "@web/views/graph/colors"
import { browser } from "@web/core/browser/browser";
import { routeToUrl } from "@web/core/browser/router_service";

class QueueDashboard extends Component {

    //Top Services
    async getTopServices() {
        let svc_search_domain = [["state", "in", ["posted"]]];
        if (this.state.period > 0) {
            svc_search_domain.push(["invoice_date", ">", this.state.current_date]);
        }

        const data = await this.orm.readGroup(
            "invoice.out",
            svc_search_domain,
            ["amount_total", "service_type_id"],
            ["service_type_id"],
            { orderby: "service_type_id", lazy: false }
        );
        this.state.getTopServices = {
            data: {
                labels: data.map(item => Array.isArray(item.service_type_id) ? item.service_type_id[1] : "Undefined"),
                datasets: [
                    {
                        label: 'Total',
                        data: data.map(item => item.amount_total),
                        hoverOffset: 4,
                        backgroundColor: data.map((_, index) => getColor(index))
                    },
                    {
                        label: 'Count',
                        data: data.map(item => item.__count),
                        hoverOffset: 4,
                        backgroundColor: data.map((_, index) => getColor(index))
                    }
                ]
            },
            // Domain for res_model 'queue.ticket' on click
            domain: (() => {
                const d = [["status", "in", ["completed"]]];
                if (this.state.period > 0) {
                    d.push(["on_date", ">", this.state.current_date]);
                }
                return d;
            })(),
            label_field: 'service_type_id.name',
            res_model: 'queue.ticket'
        }

    }

    //Top Sales People
    async getTopSalesPeople() {

        let counter_search_domain = [["status", "in", ["completed"]]];
        if (this.state.period > 0) {
            counter_search_domain.push(["on_date", ">", this.state.current_date]);
        }
        // Use readGroup to group by assigned_counter_id and count tickets per counter
        const data = await this.orm.readGroup(
            "queue.ticket",
            counter_search_domain,
            [],
            ["assigned_counter_id"],
            { orderby: "assigned_counter_id", lazy: false }
        );
        this.state.getTopSalesPeople = {
            data: {
                labels: data.map(item => Array.isArray(item.assigned_counter_id) ? item.assigned_counter_id[1] : "Undefined"),
                datasets: [
                    {
                        label: 'Total',
                        data: data.map(item => item.__count),
                        hoverOffset: 4,
                        backgroundColor: data.map((_, index) => getColor(index))
                    }
                ]
            },
            // Domain for res_model 'queue.ticket' on click
            domain: (() => {
                const d = [["status", "in", ["completed"]]];
                if (this.state.period > 0) {
                    d.push(["on_date", ">", this.state.current_date]);
                }
                return d;
            })(),
            label_field: 'assigned_counter_id.counter_name',
            res_model: 'queue.ticket'
        }


    }
    // monthly sales

    async getMonthlySales() {
        let domain = [["state", "in", ["posted", "cancelled"]]];
        if (this.state.period > 0) {
            domain.push(["invoice_date", ">", this.state.current_date]);
        }
    
        const data = await this.orm.readGroup(
            "invoice.out",
            domain,
            ["amount_total:sum"],
            ["invoice_date:month", "state"],
            { orderby: "invoice_date:month", lazy: false }
        );
    
        // Collect ordered unique month labels in raw ISO format (YYYY-MM-01)
        const rawLabels = Array.from(
            new Set(data.map(d => d["invoice_date:month"]).filter(Boolean))
        ).sort((a, b) => new Date(a) - new Date(b));
    
        // Format labels for chart display
        const labels = rawLabels.map(l => moment(l).format("MMMM YYYY")); // e.g. "June 2025"
    
        // Helper to fetch values
        const valueFor = (label, state) => {
            const rec = data.find(
                d => d["invoice_date:month"] === label && d.state === state
            );
            return rec ? rec.amount_total : 0;
        };
    
        const cancelledData = rawLabels.map(l => valueFor(l, "cancelled"));
        const postedData = rawLabels.map(l => valueFor(l, "posted"));
    
        this.state.getMonthlySales = {
            data: {
                labels, // human-readable labels
                datasets: [
                    {
                        label: 'Cancelled',
                        data: cancelledData,
                        hoverOffset: 4,
                        backgroundColor: "red",
                    },
                    {
                        label: 'Posted',
                        data: postedData,
                        hoverOffset: 4,
                        backgroundColor: "green",
                    }
                ]
            },
            domain,
            label_field: 'invoice_date',
            res_model: 'invoice.out'
        };
    }
    

    // Monthly Sales
    // async getMonthlySales() {
    //     let domain = [["state", "in", ["posted", "draft"]]];
    //     if (this.state.period > 0) {
    //         domain.push(["invoice_date", ">", this.state.current_date]);
    //     }

    //     const data = await this.orm.searchRead("invoice.out", domain, 
    //         ['state', 'service_type_id', 'amount_total', 'invoice_date'],
    //         { order: 'invoice_date' }
    //     );

    //     // Group by Month-Year
    //     const grouped = {};
    //     data.forEach(item => {
    //         const date = new Date(item.invoice_date);
    //         const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`; // MM-YYYY
    //         if (!grouped[monthYear]) {
    //             grouped[monthYear] = { draft: 0, posted: 0 };
    //         }
    //         if (item.state === 'draft') grouped[monthYear].draft += item.amount_total;
    //         if (item.state === 'posted') grouped[monthYear].posted += item.amount_total;
    //     });

    //     const labels = Object.keys(grouped).sort((a,b) => {
    //         const [m1,y1] = a.split('-').map(Number);
    //         const [m2,y2] = b.split('-').map(Number);
    //         return y1 - y2 || m1 - m2;
    //     });

    //     const draftData = labels.map(l => grouped[l].draft);
    //     const postedData = labels.map(l => grouped[l].posted);

    //     this.state.getMonthlySales = {
    //         data: {
    //             labels,
    //             datasets: [
    //                 {
    //                     label: 'Draft',
    //                     data: draftData,
    //                     hoverOffset: 4,
    //                     backgroundColor: "red"
    //                 },
    //                 {
    //                     label: 'Posted',
    //                     data: postedData,
    //                     hoverOffset: 4,
    //                     backgroundColor: "green"
    //                 }
    //             ]
    //         },
    //         domain,
    //         label_field: 'invoice_date',
    //         res_model: 'invoice.out'
    //     };
    // }


    //Partner Orders
    async getPartnerOrders() {
        // Filter on valid fields of invoice.out
        let domain = [["state", "in", ["posted"]]];
        if (this.state.period > 0){
            domain.push(["invoice_date", ">", this.state.current_date]);
        }

        const data = await this.orm.readGroup(
            "invoice.out",
            domain,
            ['partner_id', 'amount_total:sum'],
            ['partner_id'],
            { orderby: "partner_id", lazy: false }
        );

        console.log(data);

        this.state.getPartnerOrders = {
            data: {
                // Format labels to "MMM-YYYY" (e.g. Jan-2025)
                labels: data.map(d => Array.isArray(d.partner_id) ? (d.partner_id[1] || "Undefined") : (d.partner_id || "Undefined")),

                datasets: [
                    {
                        label: 'Total Amount',
                        data: data.map(d => d.amount_total),
                        hoverOffset: 4,
                        backgroundColor: "orange",
                        yAxisID: 'Total',
                        order: 1
                    },
                    {
                        label: 'ordered Qty',
                        data: data.map(d => d.amount_total),
                        hoverOffset: 4,
                        backgroundColor: "blue",
                        type: 'line',
                        borderColor: "blue",
                        yAxisID: 'QTY',
                        order: 0
                    }
                ]
            },
            scales:{
                QTY: {
                    position: 'right'
                }
            },
            label_field: 'partner_id',
            res_model: 'invoice.out'
        };

    }

    setup() {
        this.state = useState({
            cancelled_tickets:{
                value: 10,
                percentage: 6
            },
            period: 90,

        });
        this.orm = useService("orm");
        this.actionService = useService("action");
        const old_chartjs = document.querySelector('script[src="/web/static/lib/Chart/Chart.js"]');
        const router = useService("router");

        if (old_chartjs) {
            let { search, hash } = router.current;
            search.old_chartjs = old_chartjs != null ? "0":"1";
            hash.action = 559;
            browser.location.href = browser.location.origin + routeToUrl(router.current)
        }

        onWillStart(async () => {
            this.getDate();
            await this.getCancelledTickets();
            await this.getCompletedTickets();
            await this.getRevenue();
            await this.getTopServices();
            await this.getTopSalesPeople();
            await this.getMonthlySales();
            await this.getPartnerOrders();
        });
    }
    async onChangePeriod(){
        this.getDate();
        await this.getCancelledTickets();
        await this.getCompletedTickets();
        await this.getRevenue();
        await this.getTopServices();
        await this.getTopSalesPeople();
        await this.getMonthlySales();
        await this.getPartnerOrders();
    }

    getDate(){
        const formatDate = (dateObj) => {
            if (typeof moment !== 'undefined') {
                return moment(dateObj).format('YYYY-MM-DD');
            }
            const pad = (n) => String(n).padStart(2, '0');
            const y = dateObj.getFullYear();
            const m = pad(dateObj.getMonth() + 1);
            const d = pad(dateObj.getDate());
            return `${y}-${m}-${d}`;
        };
        const now = new Date();
        const current = new Date(now);
        current.setDate(current.getDate() - this.state.period);
        const previous = new Date(now);
        previous.setDate(previous.getDate() - this.state.period * 2);
        this.state.current_date = formatDate(current);
        this.state.previous_date = formatDate(previous);
    }

    async getCancelledTickets() {

    // current period
    let domain = [["status", "in", ["cancelled"]]];
    if (this.state.period > 0) {
        domain.push(["on_date", ">", this.state.current_date]);
    }

    const data = await this.orm.searchRead("queue.ticket", domain);
    this.state.cancelled_tickets.value = data.length;

    // previous period
    let prev_domain = [["status", "in", ["cancelled"]]];
    if (this.state.period > 0) {
        prev_domain.push(
            ["on_date", ">", this.state.previous_date],
            ["on_date", "<=", this.state.current_date]
        );
    }

    const prev_data = await this.orm.searchRead("queue.ticket", prev_domain);

    const percentage = ((data.length - prev_data.length) / (prev_data.length || 1)) * 100;
    this.state.cancelled_tickets.percentage = Math.round(percentage);
    }


    async getCompletedTickets() {

    // current period
    let domain = [["status", "in", ["completed"]]];
    if (this.state.period > 0) {
        domain.push(["on_date", ">", this.state.current_date]);
    }

    const data = await this.orm.searchRead("queue.ticket", domain);
    //this.state.waiting_tickets.value = data.length;

    // previous period
    let prev_domain = [["status", "in", ["completed"]]];
    if (this.state.period > 0) {
        prev_domain.push(
            ["on_date", ">", this.state.previous_date],
            ["on_date", "<=", this.state.current_date]
        );
    }

    const prev_data = await this.orm.searchRead("queue.ticket", prev_domain);

    const percentage = ((data.length - prev_data.length) / (prev_data.length || 1)) * 100;
    //this.state.waiting_tickets.percentage = Math.round(percentage);


    this.state.getCompletedTickets = {
        value: data.length,
        percentage: Math.round(percentage)
    };
    }

    async getRevenue() {

        // current period

        let revenue_domain = [["state", "in", ["posted"]]];
        if (this.state.period > 0) {
            revenue_domain.push(["invoice_date", ">", this.state.current_date]);
        }

        //const data = await this.orm.searchRead("queue.ticket", revenue_domain);
        //this.state.waiting_tickets.value = data.length;

        //const prev_data = await this.orm.searchRead("queue.ticket", prev_revenue_domain);

        //const percentage = ((data.length - prev_data.length) / (prev_data.length || 1)) * 100;
        //this.state.waiting_tickets.percentage = Math.round(percentage);

        // Revenues
        let prev_revenue_domain = [["state", "=", "posted"]];
        if (this.state.period > 0) {
            prev_revenue_domain.push(
                ["invoice_date", ">", this.state.previous_date],
                ["invoice_date", "<=", this.state.current_date]
            );
        }

        //Revenes

        const current_revenues = await this.orm.readGroup("invoice.out", revenue_domain, ["amount_total:sum"],[] );
        const prev_revenues = await this.orm.readGroup("invoice.out", prev_revenue_domain, ["amount_total:sum"],[] );
        const currentRevenueVal = (current_revenues[0] && current_revenues[0].amount_total) || 0;
        const prevRevenueVal = (prev_revenues[0] && prev_revenues[0].amount_total) || 0;
        const revenues_percentage = prevRevenueVal === 0 ? 100 : ((currentRevenueVal - prevRevenueVal) / prevRevenueVal) * 100;


        const current_average = await this.orm.readGroup("invoice.out", revenue_domain, ["amount_total:avg"],[] );
        const prev_average = await this.orm.readGroup("invoice.out", prev_revenue_domain, ["amount_total:avg"],[] );
        const currentAvgVal = (current_average[0] && current_average[0].amount_total) || 0;
        const prevAvgVal = (prev_average[0] && prev_average[0].amount_total) || 0;
        const percentage = prevAvgVal === 0 ? 100 : ((currentAvgVal - prevAvgVal) / prevAvgVal) * 100;
        
        this.state.revenues = {
            total_revenue: `$${(currentRevenueVal / 1000).toFixed(2)}k`,
            revenues_percentage: Math.round(revenues_percentage),
            average: `$${(currentAvgVal / 1000).toFixed(2)}k`,
            average_percentage: Math.round(percentage)
        };
    }

    view_Cancelled_Tickets() {
        let domain = [["status", "in", ["cancelled"]]];
        if (this.state.period > 0) {
            domain.push(["on_date", ">", this.state.current_date]);
        }
        this.actionService.doAction({
            type: "ir.actions.act_window",
            name: "Cancelled Tickets",
            res_model: "queue.ticket",
            domain: domain,
            views: [
                [false, "list"],
                [false, "form"],
            ],
            target: "current",
            context: {
                search_default_status_cancelled: 1
            }
        });

    }

    view_Completed_Tickets() {
        let domain = [["status", "in", ["completed"]]];
        if (this.state.period > 0) {
            domain.push(["on_date", ">", this.state.current_date]);
        }
        this.actionService.doAction({
            type: "ir.actions.act_window",
            name: "Completed Tickets",
            res_model: "queue.ticket",
            domain: domain,
            views: [
                [false, "list"],
                [false, "form"],
            ],
            target: "current",
            context: {
                search_default_status_completed: 1
            }
        });

    }

    view_Revenue() {
        let revenue_domain = [["state", "in", ["posted"]]];
        if (this.state.period > 0) {
            revenue_domain.push(["invoice_date", ">", this.state.current_date]);
        } 

    this.actionService.doAction({
        type: "ir.actions.act_window",
        name: "Revenues",
        res_model: "invoice.out",
        domain: revenue_domain,
        context: { group_by: ['invoice_date'], pivot_measures: ['amount_total'] },
        views: [
            [false, "pivot"],
            [false, "form"],
        ]
    });
}



}

QueueDashboard.template = "queue_management.QueueDashboardTemplate";
QueueDashboard.components = { KPICard, ChartRenderer };


registry.category("actions").add("queue_management_dashboard", QueueDashboard);

