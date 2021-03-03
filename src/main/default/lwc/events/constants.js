export const TABLE_COLUMNS = [
    {
        label: 'Time',
        fieldName: 'timeLabel',
        type: 'text',
        initialWidth: 180
    },
    {
        label: 'Channel',
        fieldName: 'channel',
        type: 'text',
        initialWidth: 200
    },
    {
        label: 'Replay Id',
        fieldName: 'replayId',
        type: 'text',
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

export const EMPTY_EVENT_DATA = {
    time: '',
    channel: '',
    replayId: '',
    payload: ''
};

export const VIEW_MODE_TABLE = 'table';
export const VIEW_MODE_TIMELINE = 'timeline';
export const VIEW_MODES = [
    { label: 'Table', value: VIEW_MODE_TABLE, iconName: 'utility:table' },
    {
        label: 'Timeline',
        value: VIEW_MODE_TIMELINE,
        iconName: 'utility:metrics'
    }
];
