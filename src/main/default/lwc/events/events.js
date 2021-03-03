import { LightningElement, api } from 'lwc';
import {
    VIEW_MODE_TABLE,
    VIEW_MODE_TIMELINE,
    TABLE_COLUMNS,
    EMPTY_EVENT_DATA
} from './constants';
import { timestampSort } from 'c/streamingUtility';

export default class EventList extends LightningElement {
    channels = [];
    events = [];
    filters = {
        channel: undefined,
        payload: undefined,
        isCaseSensitive: false,
        beforeTime: undefined,
        afterTime: undefined
    };
    filteredEvents = [];
    selectedEvent = EMPTY_EVENT_DATA;
    illustrationMessage;
    _subscriptions = [];

    isFiltersDisplayed = true;
    viewMode = VIEW_MODE_TIMELINE;

    tableColumns = TABLE_COLUMNS;

    @api
    set subscriptions(values) {
        this._subscriptions = values;
        this.updateIllustrationMessage();
    }
    get subscriptions() {
        return this._subscriptions;
    }

    @api
    addStreamingEvent(eventData) {
        this.events.push(eventData);
        this.events.sort(timestampSort);
        this.applyFilters();

        // Add channel if needed
        if (!this.channels.includes(eventData.channel)) {
            const channels = [...this.channels];
            channels.push(eventData.channel);
            channels.sort();
            this.channels = channels;
        }
    }

    /**
     * Hack that forces rerender to fix datatable responsiveness
     */
    @api
    forceRerender() {
        const viewMode = this.viewMode;
        this.viewMode = null;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.viewMode = viewMode;
        }, 1);
    }

    connectedCallback() {
        this.updateIllustrationMessage();
    }

    updateIllustrationMessage() {
        if (this.events.length === 0) {
            if (this._subscriptions.length === 0) {
                this.illustrationMessage = 'Start by subscribing to events.';
            } else {
                this.illustrationMessage = 'Waiting for events...';
            }
        } else if (!this.hasVisibleData) {
            this.illustrationMessage =
                'No events displayed. Try changing your filters.';
        } else {
            this.illustrationMessage = null;
        }
    }

    applyFilters() {
        const {
            channel,
            payload,
            isCaseSensitive,
            afterTime,
            beforeTime
        } = this.filters;
        // Clone events due to datatable bug
        let filteredEvents = [...this.events];
        // Apply channel filter
        if (channel) {
            filteredEvents = filteredEvents.filter(
                (e) => e.channel === channel
            );
        }
        // Apply after filter
        if (afterTime) {
            filteredEvents = filteredEvents.filter(
                (e) => e.timestamp && e.timestamp >= afterTime
            );
        }
        // Apply before filter
        if (beforeTime) {
            filteredEvents = filteredEvents.filter(
                (e) => e.timestamp && e.timestamp <= beforeTime
            );
        }
        // Apply payload filter
        if (payload) {
            if (isCaseSensitive) {
                filteredEvents = filteredEvents.filter(
                    (e) => e.payload && e.payload.indexOf(payload) !== -1
                );
            } else {
                const cleanFilter = payload.toLowerCase();
                filteredEvents = filteredEvents.filter(
                    (e) =>
                        e.payload &&
                        e.payload.toLowerCase().indexOf(cleanFilter) !== -1
                );
            }
        }
        // Update view
        this.filteredEvents = filteredEvents;
        this.updateIllustrationMessage();
    }

    handleFilterChange(event) {
        this.filters = event.detail;
        this.applyFilters();
    }

    handleClearEvents() {
        this.events = [];
        this.filteredEvents = [];
        this.updateIllustrationMessage();
    }

    handleFiltersDisplayToggle(event) {
        this.isFiltersDisplayed = event.detail.value;
    }

    handleViewModeChange(event) {
        this.viewMode = event.detail.value;
    }

    handleEventTableRowAction(event) {
        this.selectedEvent = event.detail.row;
        this.template.querySelector('c-modal').show();
    }

    handleTimelineSelection(event) {
        this.selectedEvent = event.detail;
        this.template.querySelector('c-modal').show();
    }

    handleCloseEventModal() {
        this.selectedEvent = EMPTY_EVENT_DATA;
    }

    get eventCountLabel() {
        const totalEvents = this.events.length;
        const filteredEvents = this.filteredEvents.length;
        if (totalEvents === filteredEvents) {
            return `Showing ${totalEvents} events`;
        }
        return `Showing ${filteredEvents} of ${totalEvents} events`;
    }

    get selectedEventPayload() {
        const { payload } = this.selectedEvent;
        if (payload) {
            return JSON.stringify(JSON.parse(payload), null, 2);
        }
        return '';
    }

    get isTableViewMode() {
        return this.viewMode === VIEW_MODE_TABLE;
    }

    get isTimelineViewMode() {
        return this.viewMode === VIEW_MODE_TIMELINE;
    }

    get hasData() {
        return this.events.length > 0;
    }

    get hasVisibleData() {
        return this.filteredEvents.length > 0;
    }

    get filterClasses() {
        return this.isFiltersDisplayed
            ? 'slds-show slds-border_bottom'
            : 'slds-hide';
    }

    get hasActiveFilters() {
        const { channel, payload, afterTime, beforeTime } = this.filters;
        return channel || payload || afterTime || beforeTime;
    }
}
