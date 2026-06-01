/* global d3 */
import { LightningElement } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import D3 from '@salesforce/resourceUrl/d3';
import getEventUsageMetrics from '@salesforce/apex/StreamingMonitorController.getEventUsageMetrics';
import { getTimeLabel, toTitleCase } from 'c/streamingUtility';

const TIME_SEGMENT_DURATION_MS = {
    Daily: 24 * 60 * 60 * 1000,
    Hourly: 60 * 60 * 1000,
    FifteenMinutes: 15 * 60 * 1000
};

export default class EventUsageMetrics extends LightningElement {
    searchFilters = {
        timeSegment: 'Hourly'
    };
    displayFilters = { eventNames: null };
    metrics = [];
    eventTypes = [];

    isD3Initialized = false;
    dimensions;
    tooltipElement;
    isDataTooltip = false;

    async connectedCallback() {
        await loadScript(this, D3);
        this.isD3Initialized = true;
        await this.fetchMetrics();
        this.drawTimeline();
    }

    async fetchMetrics() {
        try {
            let { timeSegment, startDate, endDate } = this.searchFilters;
            timeSegment = timeSegment ?? null;
            startDate = startDate ? new Date(startDate).toISOString() : null;
            endDate = endDate ? new Date(endDate).toISOString() : null;
            console.log('Fetching metrics: ', timeSegment, startDate, endDate);
            // Fetch metrics
            const rawMetrics = await getEventUsageMetrics({
                timeSegment,
                startDate,
                endDate
            });

            // Extract unique event types
            const eventNames = Array.from(
                new Set(rawMetrics.map((m) => m.Name))
            ).sort();
            this.eventTypes = eventNames.map((name, index) => ({
                index,
                name,
                label: toTitleCase(name),
                color: '#666666'
            }));

            // Transform raw metrics data
            const nameToIndex = new Map();
            this.eventTypes.forEach((eventType, index) =>
                nameToIndex.set(eventType.name, index)
            );
            this.metrics = rawMetrics.map((metric) => {
                const time = new Date(metric.StartDate);
                const timestamp = time.getTime();
                return {
                    type: nameToIndex.get(metric.Name),
                    timestamp,
                    value: metric.Value
                };
            });

            // Prepare event type color scale
            const colorScale = d3
                .scaleSequential()
                .domain([0, this.eventTypes.length])
                .interpolator(d3.interpolateRainbow);

            this.eventTypes = this.eventTypes.map((eventType, index) => {
                eventType.color = colorScale(index);
                return eventType;
            });
        } catch (error) {
            this.showError('Failed to load chart data', error);
        }
    }

    drawTimeline() {
        if (!this.isD3Initialized) {
            return;
        }
        try {
            // Remove previous timeline
            const rootElement = this.template.querySelector('.timeline');
            if (!rootElement) {
                return;
            }
            d3.select(rootElement).selectAll('*').remove();

            // Apply display filters
            let metrics = this.metrics;
            if (this.displayFilters?.eventNames !== null) {
                const { eventNames } = this.displayFilters;
                const allowedTypes = new Set(
                    this.eventTypes
                        .filter((e) => eventNames.includes(e.name))
                        .map((e) => e.index)
                );
                metrics = metrics.filter((m) => allowedTypes.has(m.type));
            }

            // Abort operation if there's no data to render
            if (metrics.length === 0) {
                return;
            }

            // Rank events by timestamp and value to avoid graph overlap
            const rankedMetrics = new Map();
            metrics.forEach((metric) => {
                const key = `${metric.timestamp}-${metric.value}`;
                const rank = rankedMetrics.get(key) ?? 0;
                rankedMetrics.set(key, rank + 1);
                metric.rank = rank;
            });

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
            svgElement.attr(
                'viewBox',
                `0 0 ${this.dimensions.width} ${this.dimensions.height}`
            );
            const bounds = svgElement.append('g');

            // Get axis domains
            const segmentDurationMs =
                TIME_SEGMENT_DURATION_MS[this.searchFilters.timeSegment];
            const xMin = metrics[0].timestamp;
            const xMax =
                metrics[metrics.length - 1].timestamp + segmentDurationMs;
            const chartTimeMargin = (xMax - xMin) * 0.1; // 10% time margin on start and end

            // Init scales
            const xScale = d3
                .scaleTime()
                .domain([xMin - chartTimeMargin, xMax + chartTimeMargin])
                .range([
                    this.dimensions.margin.left,
                    this.dimensions.width - this.dimensions.margin.right
                ]);
            const yScale = d3
                .scaleLog()
                .domain([0.1, d3.max(metrics, (d) => d.value)])
                .range([
                    this.dimensions.height - this.dimensions.margin.bottom,
                    this.dimensions.margin.top
                ])
                .clamp(true);

            // Init axes
            const xAxis = d3.axisBottom(xScale);
            const yAxisTicks = yScale.ticks().filter(Number.isInteger);
            const yAxis = d3
                .axisLeft(yScale)
                .tickValues(yAxisTicks)
                .tickFormat(d3.format('d'));

            // Add axis wrappers
            bounds
                .append('g')
                .attr('id', 'x-axis')
                .attr(
                    'transform',
                    `translate(0, ${
                        this.dimensions.height - this.dimensions.margin.bottom
                    })`
                )
                .call(xAxis);
            bounds
                .append('g')
                .attr('id', 'y-axis')
                .attr(
                    'transform',
                    `translate(${this.dimensions.margin.left}, 0)`
                )
                .call(yAxis);

            // Add tooltip element
            this.tooltipElement = d3
                .select(rootElement)
                .append('div')
                .style('visibility', 'hidden');

            // Show/hide tooltip based on mouse position
            svgElement
                .on('mousemove', (event) => {
                    if (this.isDataTooltip) {
                        return;
                    }

                    const mousePos = d3.pointer(event);
                    if (
                        mousePos[0] > this.dimensions.margin.left &&
                        mousePos[1] <
                            this.dimensions.height -
                                this.dimensions.margin.bottom
                    ) {
                        const time = xScale.invert(mousePos[0]);
                        const timeLabel = getTimeLabel(time);
                        this.drawTooltip(mousePos, timeLabel);
                    } else {
                        this.hideTooltip();
                    }
                })
                .on('mouseout', () => {
                    this.hideTooltip();
                });

            // Draw data points
            const segmentWidth =
                xScale(metrics[0].timestamp + segmentDurationMs) -
                xScale(metrics[0].timestamp);
            const segmentHeight = 10;
            bounds
                .append('g')
                .selectAll()
                .data(metrics)
                .join('rect')
                .attr('x', (d) => xScale(d.timestamp))
                .attr('y', (d) => yScale(d.value) + segmentHeight * d.rank)
                .attr('width', segmentWidth)
                .attr('height', segmentHeight)
                .attr('stroke', 'white')
                .style('fill', (d) => this.eventTypes[d.type].color)
                .on('mouseenter', (event, d) => {
                    this.isDataTooltip = true;
                    const timestamp = d.timestamp;
                    const startTimeLabel = getTimeLabel(new Date(timestamp));
                    const endTimeLabel = getTimeLabel(
                        new Date(timestamp + segmentDurationMs)
                    );
                    const mousePos = d3.pointer(event);
                    const label = `${d.value} ${
                        this.eventTypes[d.type].label
                    } between:<br/>${startTimeLabel} and<br/>${endTimeLabel}`;
                    this.drawTooltip(mousePos, label);
                })
                .on('mouseout', () => {
                    this.isDataTooltip = false;
                });
        } catch (error) {
            this.showError('Failed to draw chart', error);
        }
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

    async handleSearchFilterChange(event) {
        let { afterTime, beforeTime, timeSegment } = event.detail;
        const startDate = afterTime ? new Date(afterTime) : null;
        const endDate = beforeTime ? new Date(beforeTime) : null;
        timeSegment = timeSegment ?? null;
        this.searchFilters = { startDate, endDate, timeSegment };
        try {
            await this.fetchMetrics();
            this.drawTimeline();
        } catch (error) {
            this.showError('Failed to refresh chart', error);
        }
    }

    handleDisplayFilterChange(event) {
        const { eventNames } = event.detail;
        this.displayFilters = { eventNames };
        try {
            this.drawTimeline();
        } catch (error) {
            this.showError('Failed to refresh chart', error);
        }
    }

    showError(title, error) {
        const message =
            error?.body?.message ?? error?.message ?? JSON.stringify(error);
        this.dispatchEvent(
            new ShowToastEvent({ title, message, variant: 'error' })
        );
    }

    get timelineClasses() {
        return `timeline ${this.metrics?.length > 0 ? '' : 'slds-hide'}`;
    }

    get eventCountLabel() {
        if (this.metrics?.length === 0) {
            return 'No events to display';
        }
        return `Filtering on ${this.metrics?.length} event groups`;
    }
}
