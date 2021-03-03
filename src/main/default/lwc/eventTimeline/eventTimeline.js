/* global d3 */
import { LightningElement, api } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import D3 from '@salesforce/resourceUrl/d3';

const xAccessor = (d) => d.timestamp;
const yAccessor = (d) => d.channel;

export default class EventTimeline extends LightningElement {
    @api
    set events(values) {
        this._events = values;
        this.drawTimeline();
    }
    get events() {
        return this._events;
    }

    @api
    set channels(values) {
        this._channels = values;
        this.drawTimeline();
    }
    get channels() {
        return this._channels;
    }

    _events = [];
    _channels = [];
    isD3Initialized = false;
    dimensions;
    bounds;
    tooltip;
    xScale;
    yScale;
    xAxis;
    yAxis;

    async renderedCallback() {
        if (this.isD3Initialized) {
            this.drawTimeline();
            return;
        }
        await loadScript(this, D3);
        this.isD3Initialized = true;
        this.initializeTimeline();
        this.drawTimeline();
    }

    initializeTimeline() {
        const rootElement = this.template.querySelector('.timeline');

        // Add SVG element
        const svgElement = d3
            .select(rootElement)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '400px');

        // Get chart dimensions & use them as the SVG viewbox
        const rootElementRect = rootElement.getBoundingClientRect();
        this.dimensions = {
            width: rootElementRect.width,
            height: rootElementRect.height,
            margin: { top: 0, right: 0, bottom: 20, left: 200 }
        };
        svgElement.attr(
            'viewBox',
            `0 0 ${this.dimensions.width} ${this.dimensions.height}`
        );
        this.bounds = svgElement.append('g');

        // Add axis wrappers
        this.bounds
            .append('g')
            .attr('id', 'x-axis')
            .attr(
                'transform',
                `translate(0, ${
                    this.dimensions.height - this.dimensions.margin.bottom
                })`
            );
        this.bounds
            .append('g')
            .attr('id', 'y-axis')
            .attr('transform', `translate(${this.dimensions.margin.left}, 0)`);

        // Init scales
        this.xScale = d3
            .scaleTime()
            .range([
                this.dimensions.margin.left,
                this.dimensions.width - this.dimensions.margin.right
            ]);
        this.yScale = d3
            .scaleBand()
            .range([
                this.dimensions.margin.top,
                this.dimensions.height - this.dimensions.margin.bottom
            ])
            .paddingInner(1)
            .paddingOuter(1);

        // Init axes
        this.xAxis = d3.axisBottom(this.xScale);
        this.yAxis = d3.axisLeft(this.yScale);

        // Add tooltip element
        this.tooltip = d3
            .select(rootElement)
            .append('div')
            .attr('class', 'tooltip')
            .style('visibility', 'hidden');
    }

    drawTimeline() {
        if (!this.isD3Initialized) {
            return;
        }

        // Get time range
        const chartStartsAt = this.events[0].timestamp;
        const chartEndsAt = this.events[this.events.length - 1].timestamp;
        const chartTimeMargin = (chartEndsAt - chartStartsAt) * 0.1; // 10% time margin on start and end

        // Update scales
        this.xScale.domain([
            chartStartsAt - chartTimeMargin,
            chartEndsAt + chartTimeMargin
        ]);
        this.yScale.domain(this.channels);

        // Update axes
        const xAxisElement = this.bounds.select('#x-axis');
        xAxisElement.selectAll('g').remove();
        xAxisElement.call(this.xAxis);
        xAxisElement
            .selectAll('g')
            .filter((d) => d.getHours() === 0 && d.getMinutes() === 0)
            .attr('class', 'major-tick');
        this.bounds.select('#y-axis').transition().call(this.yAxis);

        // Draw data points
        const circles = this.bounds.selectAll('circle');
        circles
            .data(this.events)
            .join('circle')
            .attr('cx', (d) => this.xScale(xAccessor(d)))
            .attr('cy', (d) => this.yScale(yAccessor(d)))
            .attr('r', 10)
            .attr('stroke', 'white')
            .on('mouseenter', (event, d) => {
                this.drawTooltip(event, d);
            })
            .on('mouseout', () => {
                // Hide tooltip
                this.tooltip.style('visibility', 'hidden');
            })
            .on('click', (event, d) => {
                // Hide tooltip
                this.tooltip.style('visibility', 'hidden');
                // Notify selection
                const selectEvent = new CustomEvent('select', {
                    detail: d
                });
                this.dispatchEvent(selectEvent);
            });
    }

    drawTooltip(event, d) {
        // Update tooltip content to recalculate size
        this.tooltip.html(
            `${d.timeLabel}<br/>${d.channel}<br/><br/>Click for more details.`
        );
        const tooltipRect = this.tooltip.node().getBoundingClientRect();
        // Calculate tooltip pos based on circle pos
        const circleRect = event.target.getBoundingClientRect();
        const posX = circleRect.x + 10 - tooltipRect.width / 2;
        const posY = circleRect.y - 10 - tooltipRect.height;
        // Set tooltip pos and display it
        this.tooltip
            .style('left', `${posX}px`)
            .style('top', `${posY}px`)
            .style('visibility', 'visible');
    }
}
