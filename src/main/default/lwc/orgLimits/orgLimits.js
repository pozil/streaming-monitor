/* global d3 */
import { LightningElement } from 'lwc';
import getOrgLimits from '@salesforce/apex/StreamingMonitorController.getOrgLimits';
import { loadScript } from 'lightning/platformResourceLoader';
import D3 from '@salesforce/resourceUrl/d3';
import LOCALE from '@salesforce/i18n/locale';

const xAccessor = (d) => d.percent;
const yAccessor = (d) => d.name;
const numberFormatter = new Intl.NumberFormat(LOCALE);
const MARGINS = { top: 0, right: 20, bottom: 20, left: 300 };

export default class OrgLimits extends LightningElement {
    limits;
    error;
    isD3Initialized = false;

    async connectedCallback() {
        try {
            const [limits] = await Promise.all([
                getOrgLimits(),
                loadScript(this, D3)
            ]);
            this.isD3Initialized = true;
            this.limits = limits
                .map((limit) => {
                    const l = { ...limit };
                    l.percent =
                        l.max === 0 ? 0 : Math.trunc((l.value / l.max) * 100);
                    return l;
                })
                .sort((a, b) => a.name.localeCompare(b.name));
            this.drawChart();
        } catch (error) {
            this.error = JSON.stringify(error);
        }
    }

    async renderedCallback() {
        this.drawChart();
    }

    drawChart() {
        if (!this.isD3Initialized) {
            return;
        }

        const rootElement = this.template.querySelector('.chart');
        rootElement.childNodes.forEach((childNode) => childNode.remove());

        // Add SVG element
        const svg = d3
            .select(rootElement)
            .append('svg')
            .attr('width', '100%')
            .attr('height', `${this.limits.length * 30}px`);

        // Get chart dimensions & use them as the SVG viewbox
        const dimensions = rootElement.getBoundingClientRect();

        svg.attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);
        const bounds = svg.append('g');

        // Add axis wrappers
        const xAxisEl = bounds
            .append('g')
            .attr(
                'transform',
                `translate(0, ${dimensions.height - MARGINS.bottom})`
            );
        const yAxisEl = bounds
            .append('g')
            .attr('transform', `translate(${MARGINS.left}, 0)`);

        // Init scales
        const xScale = d3
            .scaleLinear()
            .range([MARGINS.left, dimensions.width - MARGINS.right])
            .domain([0, 100]);

        const yScale = d3
            .scaleBand()
            .range([MARGINS.top, dimensions.height - MARGINS.bottom])
            .domain(this.limits.map((d) => d.name))
            .paddingInner(0.25)
            .paddingOuter(0.25);

        // Init axes
        const xAxis = d3.axisBottom(xScale);
        xAxisEl.call(xAxis);
        const yAxis = d3.axisLeft(yScale).tickSize(0);
        yAxisEl.call(yAxis);

        // Add tooltip element
        d3.select(rootElement).append('div').attr('class', 'tooltip inactive');

        // Add bars
        bounds
            .selectAll('.bar')
            .data(this.limits)
            .join('rect')
            .attr('class', 'bar')
            .attr('y', (d) => yScale(yAccessor(d)))
            .attr('height', yScale.bandwidth())
            .attr('x', MARGINS.left)
            .attr('width', (d) => xScale(xAccessor(d)) - MARGINS.left)
            .on('mouseenter', (event, d) => {
                const mousePos = d3.pointer(event);
                const label = `<b>${
                    d.name
                }</b><br/>Consumed: ${numberFormatter.format(d.value)} (${
                    d.percent
                }%)<br/>Limit: ${numberFormatter.format(d.max)}`;
                this.drawTooltip(mousePos, label);
            })
            .on('mouseout', () => {
                this.hideTooltip();
            });

        //add a value label to the right of each bar
        this.limits.forEach((l) => {
            const posX = MARGINS.left + xScale(xAccessor(l)) + 3 - MARGINS.left;
            const posY = yScale(yAccessor(l)) + yScale.bandwidth() / 2 + 4;
            bounds
                .append('text')
                .attr('class', 'label')
                .attr('x', posX)
                .attr('y', posY)
                .text(`${l.percent}%`);
        });
    }

    hideTooltip() {
        const tooltipElement = this.template.querySelector('.tooltip');
        tooltipElement.classList.add('inactive');
    }

    drawTooltip(mousePos, label) {
        const tooltip = this.template.querySelector('.tooltip');
        // Update tooltip content in order to recalculate size
        // eslint-disable-next-line @lwc/lwc/no-inner-html
        tooltip.innerHTML = label;
        const tooltipRect = tooltip.getBoundingClientRect();
        // Calculate tooltip pos
        const rootElementRect = this.template
            .querySelector('.chart')
            .getBoundingClientRect();
        const posX = mousePos[0] + rootElementRect.x - tooltipRect.width / 2;
        const posY = mousePos[1] + rootElementRect.y - 30 - tooltipRect.height;
        // Set tooltip pos and display it
        tooltip.style.left = `${posX}px`;
        tooltip.style.top = `${posY}px`;
        tooltip.classList.remove('inactive');
    }
}
