import { LightningElement, api } from 'lwc';

export default class EventList extends LightningElement {
    @api events;

    eventData = { time: '', channel: '', replayId: '', payload: '' };

    handleClearReceivedEvents() {
        this.dispatchEvent(new CustomEvent('clearevents'));
    }

    handleEventTableRowAction(event) {
        this.eventData = event.detail.row;
        this.template.querySelector('c-modal').show();
    }

    handleCloseEventModal() {
        this.eventData = { time: '', channel: '', replayId: '', payload: '' };
    }

    get eventCount() {
        return this.events.length;
    }

    get columns() {
        return [
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
    }

    get eventDataPayload() {
        const { payload } = this.eventData;
        if (payload !== '') {
            return JSON.stringify(JSON.parse(payload), null, 4);
        }
        return '';
    }
}
