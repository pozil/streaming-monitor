import { LightningElement, api, track } from 'lwc';

const COLUMNS = [
    {
        label: 'Time',
        fieldName: 'time',
        type: 'text',
        sortable: true,
        initialWidth: 180
    },
    {
        label: 'Channel',
        fieldName: 'channel',
        type: 'text',
        sortable: true,
        initialWidth: 200
    },
    {
        label: 'Replay Id',
        fieldName: 'replayId',
        type: 'number',
        sortable: true,
        initialWidth: 100
    },
    { label: 'Payload', fieldName: 'payload', type: 'text' },
    {
        label: ' ',
        type: 'button-icon',
        initialWidth: 50,
        typeAttributes: {
            iconName: 'utility:zoomin',
            name: 'view',
            title: 'Click to View Details'
        }
    }
];

const NO_EVENT_DATA = { time: '', channel: '', replayId: '', payload: '' };

export default class EventList extends LightningElement {
    events = [];
    @track channels = [];
    filteredEvents = [];
    filterChannel;
    columns = COLUMNS;
    eventData = NO_EVENT_DATA;

    @api
    addStreamingEvent(eventData) {
        this.events.unshift(eventData);
        this.applyFilters();

        // Add channel to filters if needed
        if (!this.channels.includes(eventData.channel)) {
            this.channels.push(eventData.channel);
            this.channels.sort();
        }
    }

    applyFilters() {
        // Clone events due to datatable bug
        let filteredEvents = JSON.parse(JSON.stringify(this.events));
        if (this.filterChannel) {
            filteredEvents = filteredEvents.filter(
                (e) => e.channel === this.filterChannel
            );
        }
        this.filteredEvents = filteredEvents;
    }

    handleClearChannelFilter() {
        this.filterChannel = undefined;
        this.applyFilters();
    }

    handleFilterChannelChange(event) {
        this.filterChannel = event.detail.value;
        this.applyFilters();
    }

    handleClearReceivedEvents() {
        this.events = [];
        this.filteredEvents = [];
    }

    handleEventTableRowAction(event) {
        this.eventData = event.detail.row;
        this.template.querySelector('c-modal').show();
    }

    handleCloseEventModal() {
        this.eventData = NO_EVENT_DATA;
    }

    get eventCountLabel() {
        const totalEvents = this.events.length;
        const filteredEvents = this.filteredEvents.length;
        if (totalEvents === filteredEvents) {
            return totalEvents;
        }
        return `Showing ${filteredEvents} of ${totalEvents}`;
    }

    get channelOptions() {
        return this.channels.map((channel) => ({
            label: channel,
            value: channel
        }));
    }

    get hasNoChannels() {
        return this.channels.length === 0;
    }

    get eventDataPayload() {
        const { payload } = this.eventData;
        if (payload) {
            return JSON.stringify(JSON.parse(payload), null, 4);
        }
        return '';
    }
}
