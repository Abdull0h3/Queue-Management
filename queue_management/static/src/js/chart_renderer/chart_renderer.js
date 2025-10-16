/** @odoo-module **/

import { Component, onWillStart, useRef, onMounted, onWillUpdateProps, useEffect, onWillUnmount } from "@odoo/owl";
import { loadJS } from "@web/core/assets";
import { useService } from "@web/core/utils/hooks";

export class ChartRenderer extends Component {
    setup() {
        this.chartRef = useRef("chart");
        this.actionService = useService("action");
        this.chart = null; // keep reference for updates
        

        onWillStart(async () => {
            await loadJS("https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js");
        });

        onMounted(() => {
            this.renderChart();
        });

        useEffect(() => {
            this.renderChart();
        }, ()=>[this.props.config]);

        // re-render chart when props change
        onWillUpdateProps((nextProps) => {
            this.renderChart(nextProps);
        });
        onWillUnmount(() => {
            if (this.chart) {
                this.chart.destroy();
            }
        });

    }

    renderChart(props = this.props) {
        if (!props.config || !props.config.data) {
            console.warn("Chart config or data not ready yet");
            return;
        }
        
        const old_chartjs = document.querySelector('script[src="/web/static/lib/Chart/Chart.js"]');

        if (old_chartjs) {
            return;
        }
        
        // destroy old chart to avoid duplication
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(this.chartRef.el, {
            type: props.type,
            data: props.config.data,
            options: {
                onClick: (e) => {
                    const active = e.chart.getActiveElements();
                    if (active.length > 0) {
                        const label = e.chart.data.labels[active[0].index];
                        const dataset = e.chart.data.datasets[active[0].datasetIndex].label;
                        const { label_field, domain } = props.config;
                        let new_domain = domain ? [...domain] : [];

                        if (label_field) {
                            if (label_field.includes("invoice_date")) {
                                const timeStamp = Date.parse(label);
                                if (isNaN(timeStamp)) {
                                    console.error("Invalid date label:", label);
                                    return;
                                }
                                const selected_month = moment(timeStamp);
                                const start_date = selected_month.startOf("month").format("YYYY-MM-DD");
                                const end_date = selected_month.endOf("month").format("YYYY-MM-DD");
                                new_domain.push(["invoice_date", ">=", start_date]);
                                new_domain.push(["invoice_date", "<=", end_date]);
                            } else {
                                new_domain.push([label_field, "=", label]);
                            }
                        }

                        if (dataset === "Posted") {
                            new_domain.push(["state", "=", "posted"]);
                        }

                        if (dataset === "Cancelled") {
                            new_domain.push(["state", "=", "cancelled"]);
                        }

                        this.actionService.doAction({
                            type: "ir.actions.act_window",
                            name: props.title,
                            res_model: props.config?.res_model || "invoice.out",
                            domain: new_domain,
                            views: [
                                [false, "list"],
                                [false, "form"],
                            ],
                            target: "current",
                        });
                    }
                },
                responsive: true,
                plugins: {
                    legend: { position: "bottom" },
                    title: { display: true, text: props.title, position: "bottom" },
                },
                scales: 'scales' in props.config ? props.config.scales : {}
            },
        });
    }
}

ChartRenderer.template = "queue_management.ChartRenderer";
