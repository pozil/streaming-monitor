/* global d3 */
import { LightningElement } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import D3 from '@salesforce/resourceUrl/d3';
import getEventUsageMetrics from '@salesforce/apex/StreamingMonitorController.getEventUsageMetrics';
import { getTimeLabel, toTitleCase } from 'c/streamingUtility';

export default class EventUsageMetrics extends LightningElement {
    allMetrics = [];
    filteredMetrics = [];
    eventTypes = [];

    isD3Initialized = false;
    dimensions;
    bounds;
    tooltipElement;
    isDataTooltip = false;
    xScale;
    yScale;
    xAxis;
    yAxis;

    async connectedCallback() {
        try {
            let [metrics] = await Promise.all([
                getEventUsageMetrics(),
                loadScript(this, D3)
            ]);
            this.isD3Initialized = true;
            const eventNames = Array.from(
                new Set(metrics.map((m) => m.Name))
            ).sort();
            const eventIndexes = new Map();
            eventNames.forEach((item, index) => eventIndexes.set(item, index));
            metrics = metrics.map((metric) => {
                const time = new Date(metric.StartDate);
                return {
                    type: eventIndexes.get(metric.Name),
                    timestamp: time.getTime(),
                    timeLabel: getTimeLabel(time),
                    value: metric.Value
                };
            });
            const colorScale = d3
                .scaleSequential()
                .domain([0, eventNames.length])
                .interpolator(d3.interpolateRainbow);
            this.allMetrics = this.filteredMetrics = metrics;
            this.eventTypes = eventNames.map((type, index) => ({
                index,
                label: toTitleCase(type),
                color: colorScale(index)
            }));

            this.initializeTimeline();
        } catch (error) {
            console.error('Failed to initialize chart', JSON.stringify(error));
        }
    }

    async renderedCallback() {
        this.initializeTimeline();
    }

    initializeTimeline() {
        if (!this.isD3Initialized) {
            return;
        }

        const rootElement = this.template.querySelector('.timeline');
        d3.select(rootElement).selectAll('*').remove();

        // Add SVG element
        const svgElement = d3
            .select(rootElement)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '400px');

        // Get chart dimensions & use them as the SVG viewbox
        const rootElementRect = rootElement.getBoundingClientRect();
        this.dimensions = {
            x: rootElementRect.x,
            y: rootElementRect.y,
            width: rootElementRect.width,
            height: rootElementRect.height,
            margin: { top: 40, right: 40, bottom: 40, left: 40 }
        };
        svgElement
            .attr(
                'viewBox',
                `0 0 ${this.dimensions.width} ${this.dimensions.height}`
            )
            .on('mousemove', (event) => {
                if (this.isDataTooltip) {
                    return;
                }

                const mousePos = d3.pointer(event);
                if (
                    mousePos[0] > this.dimensions.margin.left &&
                    mousePos[1] <
                        this.dimensions.height - this.dimensions.margin.bottom
                ) {
                    const time = this.xScale.invert(mousePos[0]);
                    const timeLabel = getTimeLabel(time);
                    this.drawTooltip(mousePos, timeLabel);
                } else {
                    this.hideTooltip();
                }
            })
            .on('mouseout', () => {
                this.hideTooltip();
            });
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
            .scaleLog()
            .range([
                this.dimensions.height - this.dimensions.margin.bottom,
                this.dimensions.margin.top
            ]);

        // Init axes
        this.xAxis = d3.axisBottom(this.xScale);
        this.yAxis = d3.axisLeft(this.yScale);

        // Add tooltip element
        this.tooltipElement = d3
            .select(rootElement)
            .append('div')
            .style('visibility', 'hidden');

        // Draw timeline
        try {
            this.drawTimeline();
        } catch (error) {
            console.error('Failed to draw chart: ', JSON.stringify(error));
        }
    }

    drawTimeline() {
        if (this.filteredMetrics.length === 0) {
            return;
        }
        // Get x (time) range
        const xMin = this.filteredMetrics[0].timestamp;
        const xMax =
            this.filteredMetrics[this.filteredMetrics.length - 1].timestamp;
        const chartTimeMargin = (xMax - xMin) * 0.1; // 10% time margin on start and end
        // Get y values
        const values = this.filteredMetrics.map((m) => m.value);

        // Update scales
        this.xScale.domain([xMin - chartTimeMargin, xMax + chartTimeMargin]);
        this.yScale.domain([Math.min(...values), Math.max(...values)]);

        // Update axes
        const xAxisElement = this.bounds.select('#x-axis');
        xAxisElement.selectAll('g').remove();
        xAxisElement.call(this.xAxis);
        this.bounds.select('#y-axis').transition().call(this.yAxis);

        // Draw data points
        const circles = this.bounds.selectAll('circle');
        circles
            .data(this.filteredMetrics)
            .join('circle')
            .attr('cx', (d) => this.xScale(d.timestamp))
            .attr('cy', (d) => this.yScale(d.value))
            .attr('r', 10)
            .attr('stroke', 'white')
            .style('fill', (d) => this.eventTypes[d.type].color)
            .on('mouseenter', (event, d) => {
                this.isDataTooltip = true;
                const mousePos = d3.pointer(event);
                const label = `${d.timeLabel}<br/>${d.value} ${
                    this.eventTypes[d.type].label
                }`;
                this.drawTooltip(mousePos, label);
            })
            .on('mouseout', () => {
                this.isDataTooltip = false;
            });
    }

    hideTooltip() {
        this.tooltipElement.style('visibility', 'hidden');
    }

    drawTooltip(mousePos, label) {
        // Update tooltip content in order to recalculate size
        this.tooltipElement.html(label);
        const tooltipRect = this.tooltipElement.node().getBoundingClientRect();
        // Calculate tooltip pos
        const posX = mousePos[0] + this.dimensions.x - tooltipRect.width / 2;
        const posY = mousePos[1] + this.dimensions.y - 30 - tooltipRect.height;
        // Set tooltip pos and display it
        this.tooltipElement
            .style('left', `${posX}px`)
            .style('top', `${posY}px`)
            .style('visibility', 'visible')
            .attr('class', this.isDataTooltip ? 'tooltip data' : 'tooltip');
    }

    handleFilterChange(event) {
        const { afterTime, beforeTime, eventTypes } = event.detail;
        let filteredMetrics = this.allMetrics;
        // Apply after filter
        if (afterTime) {
            filteredMetrics = filteredMetrics.filter(
                (e) => e.timestamp && e.timestamp >= afterTime
            );
        }
        // Apply before filter
        if (beforeTime) {
            filteredMetrics = filteredMetrics.filter(
                (e) => e.timestamp && e.timestamp <= beforeTime
            );
        }
        // Apply event type filters
        const hiddenTypes = [];
        eventTypes.forEach((isChecked, index) => {
            if (!isChecked) {
                hiddenTypes.push(index);
            }
        });
        if (hiddenTypes.length > 0) {
            filteredMetrics = filteredMetrics.filter(
                (e) => !hiddenTypes.includes(e.type)
            );
        }
        // Update view
        this.filteredMetrics = filteredMetrics;
        this.drawTimeline();
    }

    get timelineClasses() {
        return `timeline ${
            this.filteredMetrics?.length > 0 ? '' : 'slds-hide'
        }`;
    }

    get eventCountLabel() {
        if (this.allMetrics?.length === 0) {
            return 'No data to display';
        }
        if (this.allMetrics?.length !== this.filteredMetrics?.length) {
            return `Showing ${this.filteredMetrics?.length} of ${this.allMetrics?.length} items`;
        }
        return `Showing ${this.allMetrics?.length} items`;
    }
}
